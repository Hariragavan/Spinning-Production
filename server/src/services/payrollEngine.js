import { Worker } from '../models/Worker.js';
import { ShiftAllocation } from '../models/ShiftAllocation.js';
import { DailyProductionLog } from '../models/DailyProductionLog.js';
import { MachineEMLog } from '../models/MachineEMLog.js';
import { IncentiveRule } from '../models/IncentiveRule.js';
import { YarnCount } from '../models/YarnCount.js';
import { matchIncentiveRule, calculateSlabPayout } from './calculationEngine.js';

export async function getMonthlyPayrollData(yearMonth) {
  // yearMonth format: "YYYY-MM", e.g. "2026-10"
  const regex = new RegExp(`^${yearMonth}`);

  const [workers, allocations, prodLogs, emLogs, rules, counts] = await Promise.all([
    Worker.find().sort({ tokenNumber: 1 }).lean(),
    ShiftAllocation.find({ date: { $regex: regex } }).lean(),
    DailyProductionLog.find({ date: { $regex: regex } }).lean(),
    MachineEMLog.find({ date: { $regex: regex } }).lean(),
    IncentiveRule.find().lean(),
    YarnCount.find().lean()
  ]);

  // Index logs by date_shift_machine
  const prodLogMap = new Map();
  prodLogs.forEach(p => {
    prodLogMap.set(`${p.date}_${p.shift}_${p.machineNumber}`, p);
  });

  const emLogMap = new Map();
  emLogs.forEach(e => {
    emLogMap.set(`${e.date}_${e.shift}_${e.machineNumber}`, e);
  });

  // Track worker monthly stats
  // token -> { dutiesSet: Set of 'date_shift', dailyIncentive: { [day]: num }, totalIncentive: 0, emList: [], gpsList: [], dutiesHistory: [] }
  const workerStats = new Map();
  workers.forEach(w => {
    workerStats.set(w.tokenNumber, {
      tokenNumber: w.tokenNumber,
      name: w.name,
      department: w.department,
      avatarUrl: w.avatarUrl,
      dutiesSet: new Set(),
      dailyMap: {}, // day: number
      totalIncentive: 0,
      emList: [],
      gpsList: [],
      dutiesHistory: []
    });
  });

  // Process all allocations
  for (const alloc of allocations) {
    const { date, shift, allocations: sideAllocs } = alloc;
    const day = parseInt(date.split('-')[2], 10);

    // Group side allocations by worker for this shift
    const workerShiftSides = new Map();
    sideAllocs.forEach(a => {
      if (a.workerToken) {
        if (!workerShiftSides.has(a.workerToken)) {
          workerShiftSides.set(a.workerToken, []);
        }
        workerShiftSides.get(a.workerToken).push(a);
      }
    });

    workerShiftSides.forEach((sides, token) => {
      let siderObj = workerStats.get(token);
      if (!siderObj) {
        siderObj = {
          tokenNumber: token,
          name: `Worker ${token}`,
          department: 'SIDER',
          avatarUrl: null,
          dutiesSet: new Set(),
          dailyMap: {},
          totalIncentive: 0,
          emList: [],
          gpsList: [],
          dutiesHistory: []
        };
        workerStats.set(token, siderObj);
      }

      siderObj.dutiesSet.add(`${date}_${shift}`);

      let shiftIncentive = 0;
      const sideBreakdowns = [];

      for (const sideItem of sides) {
        const prod = prodLogMap.get(`${date}_${shift}_${sideItem.machineNumber}`);
        const em = emLogMap.get(`${date}_${shift}_${sideItem.machineNumber}`);
        const actualGps = prod?.actualGps || 0;
        const countCode = prod?.countCode || 'UNKNOWN';
        const emValue = em?.emValue ?? 0;

        let ruleMissing = false;
        let amountPerSide = 0;

        if (prod && prod.countCode) {
          const rule = matchIncentiveRule(prod.countCode, rules);
          if (rule) {
            const payout = calculateSlabPayout(actualGps, rule);
            amountPerSide = payout.amountPerSide;
          } else {
            ruleMissing = true;
          }
        }

        shiftIncentive += amountPerSide;
        if (actualGps > 0) siderObj.gpsList.push(actualGps);
        if (emValue > 0) siderObj.emList.push(emValue);

        sideBreakdowns.push({
          machineNumber: sideItem.machineNumber,
          side: sideItem.side,
          countCode,
          actualGps,
          emValue,
          amountPerSide,
          ruleMissing
        });
      }

      siderObj.dailyMap[day] = (siderObj.dailyMap[day] || 0) + shiftIncentive;
      siderObj.totalIncentive += shiftIncentive;

      siderObj.dutiesHistory.push({
        date,
        shift,
        sidesCount: sides.length,
        workloadPct: sides.length * 50,
        shiftIncentive,
        sideBreakdowns
      });
    });
  }

  // Build Results
  const allWorkersList = Array.from(workerStats.values());

  // 1. Monthly Abstract (Accounts View)
  const monthlyAbstract = allWorkersList.map((w, idx) => ({
    sno: idx + 1,
    tokenNumber: w.tokenNumber,
    name: w.name,
    department: w.department,
    totalDuties: w.dutiesSet.size,
    grossIncentive: Math.round(w.totalIncentive)
  })).sort((a, b) => b.grossIncentive - a.grossIncentive);

  // Re-assign S.No after sorting
  monthlyAbstract.forEach((item, index) => { item.sno = index + 1; });

  // 2. Master 31-Day Incentive Grid
  const matrix31Days = allWorkersList.map(w => {
    const avgEm = w.emList.length > 0
      ? Number((w.emList.reduce((a, b) => a + b, 0) / w.emList.length).toFixed(2))
      : 0;
    const avgGps = w.gpsList.length > 0
      ? Number((w.gpsList.reduce((a, b) => a + b, 0) / w.gpsList.length).toFixed(2))
      : 0;

    return {
      tokenNumber: w.tokenNumber,
      name: w.name,
      department: w.department,
      days: w.dailyMap,
      totalDuties: w.dutiesSet.size,
      totalIncentive: Math.round(w.totalIncentive),
      avgEm,
      avgGps
    };
  }).sort((a, b) => a.tokenNumber.localeCompare(b.tokenNumber, undefined, { numeric: true }));

  // 3. EM Quality & Breakage Audit
  const emQualityAudit = allWorkersList
    .filter(w => w.dutiesSet.size > 0)
    .map(w => {
      const avgEm = w.emList.length > 0
        ? Number((w.emList.reduce((a, b) => a + b, 0) / w.emList.length).toFixed(2))
        : 0;
      return {
        tokenNumber: w.tokenNumber,
        name: w.name,
        totalDuties: w.dutiesSet.size,
        avgEm,
        isOutlier: avgEm > 4.0,
        highestEm: w.emList.length > 0 ? Math.max(...w.emList) : 0,
        sampleCount: w.emList.length
      };
    })
    .sort((a, b) => b.avgEm - a.avgEm);

  // Machine-level EM breakdown
  const machineEmMap = new Map();
  emLogs.forEach(e => {
    if (!machineEmMap.has(e.machineNumber)) {
      machineEmMap.set(e.machineNumber, { list: [], breakList: [], wasteList: [] });
    }
    const m = machineEmMap.get(e.machineNumber);
    m.list.push(e.emValue);
    m.breakList.push(e.breakCount || 0);
    m.wasteList.push(e.pneumafilWastePct || 0);
  });

  const machineEmAudit = Array.from(machineEmMap.entries()).map(([machineNumber, data]) => {
    const avgEm = Number((data.list.reduce((a, b) => a + b, 0) / data.list.length).toFixed(2));
    const avgBreaks = Number((data.breakList.reduce((a, b) => a + b, 0) / data.breakList.length).toFixed(1));
    const avgWaste = Number((data.wasteList.reduce((a, b) => a + b, 0) / data.wasteList.length).toFixed(2));
    return {
      machineNumber,
      avgEm,
      avgBreaks,
      avgWaste,
      isOutlier: avgEm > 4.0,
      totalRecords: data.list.length
    };
  }).sort((a, b) => b.avgEm - a.avgEm);

  // 4. Top 6 Siders Hall of Fame
  const top6Siders = monthlyAbstract.slice(0, 6).map((item, idx) => {
    const raw = workerStats.get(item.tokenNumber);
    const duties = item.totalDuties;
    const avgPayout = duties > 0 ? Math.round(item.grossIncentive / duties) : 0;
    const avgGps = raw?.gpsList?.length > 0
      ? Number((raw.gpsList.reduce((a, b) => a + b, 0) / raw.gpsList.length).toFixed(1))
      : 0;

    return {
      rank: idx + 1,
      tokenNumber: item.tokenNumber,
      name: item.name,
      avatarUrl: raw?.avatarUrl || null,
      completedDuties: duties,
      totalIncentive: item.grossIncentive,
      avgPayoutPerShift: avgPayout,
      avgGps
    };
  });

  return {
    yearMonth,
    monthlyAbstract,
    matrix31Days,
    emQualityAudit,
    machineEmAudit,
    top6Siders,
    summary: {
      totalDisbursement: monthlyAbstract.reduce((a, b) => a + b.grossIncentive, 0),
      totalDuties: monthlyAbstract.reduce((a, b) => a + b.totalDuties, 0),
      activeWorkersCount: monthlyAbstract.filter(w => w.totalDuties > 0).length,
      averagePerWorker: monthlyAbstract.filter(w => w.totalDuties > 0).length > 0
        ? Math.round(monthlyAbstract.reduce((a, b) => a + b.grossIncentive, 0) / monthlyAbstract.filter(w => w.totalDuties > 0).length)
        : 0
    }
  };
}

export async function getWorkerPassbook(tokenNumber, yearMonth = null) {
  const worker = await Worker.findOne({ tokenNumber }).lean();
  if (!worker) return null;

  let query = {};
  if (yearMonth) {
    query.date = { $regex: new RegExp(`^${yearMonth}`) };
  }

  const [allocations, prodLogs, emLogs, rules] = await Promise.all([
    ShiftAllocation.find(query).sort({ date: -1, shift: -1 }).lean(),
    DailyProductionLog.find(query).lean(),
    MachineEMLog.find(query).lean(),
    IncentiveRule.find().lean()
  ]);

  const prodLogMap = new Map();
  prodLogs.forEach(p => prodLogMap.set(`${p.date}_${p.shift}_${p.machineNumber}`, p));

  const emLogMap = new Map();
  emLogs.forEach(e => emLogMap.set(`${e.date}_${e.shift}_${e.machineNumber}`, e));

  const shiftEntries = [];
  let totalGrossIncentive = 0;
  const gpsList = [];
  const emList = [];

  for (const alloc of allocations) {
    const { date, shift, allocations: sideAllocs } = alloc;
    const assignedSides = sideAllocs.filter(a => a.workerToken === tokenNumber);

    if (assignedSides.length > 0) {
      let shiftIncentive = 0;
      const sidesDetail = [];

      for (const s of assignedSides) {
        const prod = prodLogMap.get(`${date}_${shift}_${s.machineNumber}`);
        const em = emLogMap.get(`${date}_${shift}_${s.machineNumber}`);
        const actualGps = prod?.actualGps || 0;
        const countCode = prod?.countCode || 'UNKNOWN';
        const emValue = em?.emValue ?? 0;

        let ruleMissing = false;
        let amountPerSide = 0;

        if (prod && prod.countCode) {
          const rule = matchIncentiveRule(prod.countCode, rules);
          if (rule) {
            const payout = calculateSlabPayout(actualGps, rule);
            amountPerSide = payout.amountPerSide;
          } else {
            ruleMissing = true;
          }
        }

        shiftIncentive += amountPerSide;
        if (actualGps > 0) gpsList.push(actualGps);
        if (emValue > 0) emList.push(emValue);

        sidesDetail.push({
          machineNumber: s.machineNumber,
          side: s.side,
          countCode,
          actualGps,
          emValue,
          amountPerSide,
          ruleMissing
        });
      }

      totalGrossIncentive += shiftIncentive;
      shiftEntries.push({
        date,
        shift,
        sidesCount: assignedSides.length,
        workloadPct: assignedSides.length * 50,
        shiftIncentive,
        sidesDetail
      });
    }
  }

  const avgGps = gpsList.length > 0
    ? Number((gpsList.reduce((a, b) => a + b, 0) / gpsList.length).toFixed(2))
    : 0;
  const avgEm = emList.length > 0
    ? Number((emList.reduce((a, b) => a + b, 0) / emList.length).toFixed(2))
    : 0;

  return {
    worker,
    summary: {
      totalDuties: shiftEntries.length,
      netEarnings: Math.round(totalGrossIncentive),
      avgGps,
      avgEm,
      hasOutlierEm: avgEm > 4.0
    },
    shiftEntries
  };
}
