import * as XLSX from 'xlsx';
import { DailyProductionLog } from '../models/DailyProductionLog.js';
import { MachineEMLog } from '../models/MachineEMLog.js';
import { calculateShiftIncentives } from './calculationEngine.js';

export function normalizeMachineNumber(val) {
  if (!val) return '';
  let str = String(val).trim().toUpperCase();
  // If starts with SP, K, or RF
  if (str.startsWith('SP')) {
    const numMatch = str.match(/\d+/);
    if (!numMatch) return str;
    const num = parseInt(numMatch[0], 10);
    return `SP${String(num).padStart(3, '0')}`;
  }
  if (str.startsWith('K') || str.startsWith('RF')) {
    return str; // keep K01 or RF063 as is
  }
  const numMatch = str.match(/\d+/);
  if (!numMatch) return str;
  const num = parseInt(numMatch[0], 10);
  return `SP${String(num).padStart(3, '0')}`;
}

export function normalizeShift(val) {
  if (!val) return 'I';
  const str = String(val).trim().toUpperCase();
  if (str === '1' || str === 'SHIFT 1' || str === 'SHIFT I' || str === 'MORNING' || str === 'I') return 'I';
  if (str === '2' || str === 'SHIFT 2' || str === 'SHIFT II' || str === 'AFTERNOON' || str === 'II') return 'II';
  if (str === '3' || str === 'SHIFT 3' || str === 'SHIFT III' || str === 'NIGHT' || str === 'III') return 'III';
  return 'I';
}

export function normalizeDate(val, fallbackDate = null) {
  if (!val && fallbackDate) return fallbackDate;
  if (!val) return new Date().toISOString().split('T')[0];

  // If number (Excel serial date number, e.g. 46299 -> 2026-10-04)
  if (typeof val === 'number') {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    return jsDate.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) {
      year = `20${year}`;
    }
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      // DD-MM-YYYY
      return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  return fallbackDate || new Date().toISOString().split('T')[0];
}

export function parseRunHours(val) {
  if (val === null || val === undefined || val === '') return 8.0;
  if (typeof val === 'number') return Number(val.toFixed(2));
  const str = String(val).trim();
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    const hrs = parts[0] || 0;
    const mins = parts[1] || 0;
    return Number((hrs + (mins / 60)).toFixed(2));
  }
  const parsed = parseFloat(str);
  return !isNaN(parsed) ? Number(parsed.toFixed(2)) : 8.0;
}

/**
 * Robust Production Statement Parser
 * Supports:
 * 1. SCM Textile Spinners Framewise Production Report format (multi-shift, row 11 headers)
 * 2. Standard columnar spreadsheet with column headers
 */
export async function parseAndIngestProductionExcel(buffer, targetDate = null, targetShift = null) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Extract 2D array representation for format detection
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  let processedCount = 0;
  let skippedCount = 0;
  const errors = [];
  const modifiedShiftKeys = new Set();

  // Check if this is the SCM Official Mill Report format
  const isScmFramewiseReport = grid.some(row => 
    row.some(cell => typeof cell === 'string' && /Spinning Framewise Production|SCM TEXTILE/i.test(cell)) ||
    (row[0] === 'Frame No.' && row[1] === 'Count')
  );

  if (isScmFramewiseReport) {
    let currentShiftDate = targetDate;
    let currentShift = targetShift || 'I';

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      if (!row || row.length === 0) continue;

      const firstCell = row[0];
      const secondCell = row[1];

      // Detect Date & Shift Section Row: e.g. [46299, 'I'] or ['04/10/26', 'I']
      if (
        (typeof firstCell === 'number' || (typeof firstCell === 'string' && /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(firstCell))) &&
        (secondCell === 'I' || secondCell === 'II' || secondCell === 'III' || secondCell === 1 || secondCell === 2 || secondCell === 3)
      ) {
        currentShiftDate = normalizeDate(firstCell, targetDate);
        currentShift = normalizeShift(secondCell);
        continue;
      }

      // Check if machine row
      const machineRaw = String(firstCell).trim().toUpperCase();
      if (/^(SP|K|RF)\d+/i.test(machineRaw)) {
        const machineNumber = normalizeMachineNumber(machineRaw);
        const countCode = String(row[1]).trim() || '40s';
        const runHours = parseRunHours(row[3]);
        const hanks = parseFloat(row[6]) || 0;
        const productionKg = parseFloat(row[8]) || 0;
        const targetKg = parseFloat(row[9]) || parseFloat(row[10]) || 0;
        const actualGps = parseFloat(row[11]) || 0;
        const efficiencyPct = parseFloat(row[12]) || 0;
        const utilizationPct = parseFloat(row[13]) || Number(((runHours / 8.0) * 100).toFixed(1));
        const wastePct = parseFloat(row[29]) || 0;

        const date = currentShiftDate || targetDate || new Date().toISOString().split('T')[0];
        const shift = currentShift || targetShift || 'I';

        try {
          await DailyProductionLog.findOneAndUpdate(
            { date, shift, machineNumber },
            {
              date,
              shift,
              machineNumber,
              countCode,
              hanks,
              productionKg: Number(productionKg.toFixed(2)),
              targetKg: Number(targetKg.toFixed(2)),
              runHours,
              stoppedHours: Math.max(0, Number((8.0 - runHours).toFixed(2))),
              actualGps: Number(actualGps.toFixed(2)),
              utilizationPct: Number(utilizationPct.toFixed(1)),
              efficiencyPct: Number(efficiencyPct.toFixed(1))
            },
            { upsert: true, new: true }
          );

          // Also auto-record EM/waste telemetry from the same row
          const emValue = wastePct > 0 ? Number((wastePct * 2.5).toFixed(2)) : 1.8;
          await MachineEMLog.findOneAndUpdate(
            { date, shift, machineNumber },
            {
              date,
              shift,
              machineNumber,
              breakCount: Math.round(emValue * 10),
              pneumafilWastePct: wastePct,
              emValue
            },
            { upsert: true, new: true }
          );

          processedCount++;
          modifiedShiftKeys.add(`${date}_${shift}`);
        } catch (err) {
          skippedCount++;
          errors.push(`Row ${r + 1}: ${err.message}`);
        }
      }
    }
  } else {
    // Standard Columnar Header Spreadsheet
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    for (let i = 0; i < jsonRows.length; i++) {
      const row = jsonRows[i];

      const machineKey = Object.keys(row).find(k => /m\/?c|rf|frame|machine/i.test(k));
      const machineRaw = machineKey ? row[machineKey] : null;
      const machineNumber = normalizeMachineNumber(machineRaw);

      if (!machineNumber || (!machineNumber.startsWith('SP') && !machineNumber.startsWith('K') && !machineNumber.startsWith('RF'))) {
        skippedCount++;
        continue;
      }

      const dateKey = Object.keys(row).find(k => /date/i.test(k));
      const date = normalizeDate(dateKey ? row[dateKey] : null, targetDate);

      const shiftKey = Object.keys(row).find(k => /shift/i.test(k));
      const shift = targetShift ? normalizeShift(targetShift) : normalizeShift(shiftKey ? row[shiftKey] : null);

      const countKey = Object.keys(row).find(k => /count/i.test(k));
      const countCode = countKey && row[countKey] ? String(row[countKey]).trim() : '40s';

      const hanksKey = Object.keys(row).find(k => /hank/i.test(k));
      const hanks = hanksKey ? parseFloat(row[hanksKey]) || 0 : 0;

      const prodKey = Object.keys(row).find(k => /net\s*kg|prod.*kg|production|actual/i.test(k));
      const productionKg = prodKey ? parseFloat(row[prodKey]) || 0 : 0;

      const gpsKey = Object.keys(row).find(k => /^gps$|actual.*gps|gms.*spl/i.test(k));
      const actualGps = gpsKey ? parseFloat(row[gpsKey]) || 0 : (productionKg > 0 ? Number((productionKg / 1.15).toFixed(1)) : 0);

      const targetKey = Object.keys(row).find(k => /target|calc.*kg|std/i.test(k));
      const targetKg = targetKey ? parseFloat(row[targetKey]) || 0 : 0;

      const runKey = Object.keys(row).find(k => /run.*hr|hours/i.test(k));
      const runHours = runKey ? parseRunHours(row[runKey]) : 8.0;

      const effKey = Object.keys(row).find(k => /eff/i.test(k));
      const efficiencyPct = effKey ? parseFloat(row[effKey]) || 0 : (runHours > 0 ? Number(((runHours / 8.0) * 94.5).toFixed(1)) : 0);

      const utilKey = Object.keys(row).find(k => /util/i.test(k));
      const utilizationPct = utilKey ? parseFloat(row[utilKey]) || 0 : Number(((runHours / 8.0) * 100).toFixed(1));

      try {
        await DailyProductionLog.findOneAndUpdate(
          { date, shift, machineNumber },
          {
            date,
            shift,
            machineNumber,
            countCode,
            hanks,
            productionKg: Number(productionKg.toFixed(2)),
            targetKg: Number(targetKg.toFixed(2)),
            runHours,
            stoppedHours: Math.max(0, Number((8.0 - runHours).toFixed(2))),
            actualGps: Number(actualGps.toFixed(2)),
            utilizationPct: Number(utilizationPct.toFixed(1)),
            efficiencyPct: Number(efficiencyPct.toFixed(1))
          },
          { upsert: true, new: true }
        );

        processedCount++;
        modifiedShiftKeys.add(`${date}_${shift}`);
      } catch (err) {
        skippedCount++;
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }
  }

  // Trigger calculation for all affected shifts
  for (const shiftKey of modifiedShiftKeys) {
    const [d, s] = shiftKey.split('_');
    try {
      await calculateShiftIncentives(d, s);
    } catch (e) {
      console.warn(`[Auto-Calc Warning] ${e.message}`);
    }
  }

  return {
    success: true,
    processedCount,
    skippedCount,
    errors,
    affectedShifts: Array.from(modifiedShiftKeys)
  };
}

/**
 * Ingest Machine EM Sheet Excel buffer
 */
export async function parseAndIngestEMExcel(buffer, targetDate = null, targetShift = null) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  let processedCount = 0;
  let skippedCount = 0;
  const errors = [];
  const modifiedShiftKeys = new Set();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    const machineKey = Object.keys(row).find(k => /m\/?c|rf|frame|machine/i.test(k));
    const machineRaw = machineKey ? row[machineKey] : null;
    const machineNumber = normalizeMachineNumber(machineRaw);

    if (!machineNumber) {
      skippedCount++;
      continue;
    }

    const dateKey = Object.keys(row).find(k => /date/i.test(k));
    const date = normalizeDate(dateKey ? row[dateKey] : null, targetDate);

    const shiftKey = Object.keys(row).find(k => /shift/i.test(k));
    const shift = targetShift ? normalizeShift(targetShift) : normalizeShift(shiftKey ? row[shiftKey] : null);

    const breakKey = Object.keys(row).find(k => /break/i.test(k));
    const breakCount = breakKey ? parseInt(row[breakKey], 10) || 0 : 0;

    const wasteKey = Object.keys(row).find(k => /waste|pneumafil/i.test(k));
    const pneumafilWastePct = wasteKey ? parseFloat(row[wasteKey]) || 0.0 : 0.0;

    const emKey = Object.keys(row).find(k => /^em$|em.*val/i.test(k));
    const emValue = emKey ? parseFloat(row[emKey]) || 0 : (pneumafilWastePct > 0 ? Number((pneumafilWastePct * 2.5).toFixed(2)) : 2.0);

    try {
      await MachineEMLog.findOneAndUpdate(
        { date, shift, machineNumber },
        {
          date,
          shift,
          machineNumber,
          breakCount,
          pneumafilWastePct,
          emValue
        },
        { upsert: true, new: true }
      );

      processedCount++;
      modifiedShiftKeys.add(`${date}_${shift}`);
    } catch (err) {
      skippedCount++;
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  // Auto-trigger calculation for affected shifts
  for (const shiftKey of modifiedShiftKeys) {
    const [d, s] = shiftKey.split('_');
    try {
      await calculateShiftIncentives(d, s);
    } catch (e) {
      console.warn(`[Auto-Calc Warning] ${e.message}`);
    }
  }

  return {
    success: true,
    processedCount,
    skippedCount,
    errors,
    affectedShifts: Array.from(modifiedShiftKeys)
  };
}
