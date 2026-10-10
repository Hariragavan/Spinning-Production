import express from 'express';
import { DailyProductionLog } from '../models/DailyProductionLog.js';
import { MachineEMLog } from '../models/MachineEMLog.js';
import { YarnCount } from '../models/YarnCount.js';
import { Machine } from '../models/Machine.js';

const router = express.Router();

router.get('/production', async (req, res) => {
  try {
    const { date = '2026-10-10', shift = 'I', range = 'daily', month = '2026-10' } = req.query;

    let prodQuery = {};
    let emQuery = {};

    if (range === 'mtd') {
      prodQuery.date = { $regex: new RegExp(`^${month}`) };
      emQuery.date = { $regex: new RegExp(`^${month}`) };
    } else {
      prodQuery.date = date;
      prodQuery.shift = shift;
      emQuery.date = date;
      emQuery.shift = shift;
    }

    const [prodLogs, emLogs, counts, machines] = await Promise.all([
      DailyProductionLog.find(prodQuery).lean(),
      MachineEMLog.find(emQuery).lean(),
      YarnCount.find({ isActive: true }).lean(),
      Machine.find({ isActive: true }).sort({ displayOrder: 1, machineNumber: 1 }).lean()
    ]);

    const countMap = new Map();
    counts.forEach(c => countMap.set(c.countCode, c));

    const emLogMap = new Map();
    emLogs.forEach(e => {
      const key = range === 'mtd' ? e.machineNumber : `${e.date}_${e.shift}_${e.machineNumber}`;
      if (range === 'mtd') {
        if (!emLogMap.has(key)) emLogMap.set(key, []);
        emLogMap.get(key).push(e);
      } else {
        emLogMap.set(key, e);
      }
    });

    // 1. Count Summary & Variance Table
    const countAgg = new Map();
    prodLogs.forEach(p => {
      if (!countAgg.has(p.countCode)) {
        countAgg.set(p.countCode, {
          countCode: p.countCode,
          countName: countMap.get(p.countCode)?.countName || p.countCode,
          standardGps: countMap.get(p.countCode)?.standardGps || 0,
          records: 0,
          totalActualGps: 0,
          totalTargetKg: 0,
          totalActualKg: 0,
          machineNumbers: new Set()
        });
      }
      const item = countAgg.get(p.countCode);
      item.records++;
      item.totalActualGps += (p.actualGps || 0);
      item.totalTargetKg += (p.targetKg || 0);
      item.totalActualKg += (p.productionKg || 0);
      item.machineNumbers.add(p.machineNumber);
    });

    const countSummary = Array.from(countAgg.values()).map(c => {
      const actualGps = c.records > 0 ? Number((c.totalActualGps / c.records).toFixed(2)) : 0;
      const deliveryVariance = Number((actualGps - c.standardGps).toFixed(2));
      const targetKg = Number(c.totalTargetKg.toFixed(1));
      const actualKg = Number(c.totalActualKg.toFixed(1));
      const variancePct = targetKg > 0 ? Number((((actualKg - targetKg) / targetKg) * 100).toFixed(1)) : 0;

      return {
        countCode: c.countCode,
        countName: c.countName,
        runningFrames: c.machineNumbers.size,
        standardGps: c.standardGps,
        actualGps,
        deliveryVariance,
        targetKg,
        actualKg,
        variancePct
      };
    });

    // 2. Count-Wise GPS Run Chart (Timeline across the month)
    // Query logs for the whole month to build trend
    const monthLogs = await DailyProductionLog.find({
      date: { $regex: new RegExp(`^${month}`) }
    }).sort({ date: 1 }).lean();

    const dateCountMap = new Map();
    // Group by date, calculate average GPS per countCode
    monthLogs.forEach(ml => {
      if (!dateCountMap.has(ml.date)) {
        dateCountMap.set(ml.date, { date: ml.date.slice(5) }); // MM-DD
      }
      const dayObj = dateCountMap.get(ml.date);
      const countKey = ml.countCode;
      if (!dayObj[`${countKey}_sum`]) {
        dayObj[`${countKey}_sum`] = 0;
        dayObj[`${countKey}_count`] = 0;
      }
      dayObj[`${countKey}_sum`] += ml.actualGps;
      dayObj[`${countKey}_count`] += 1;
    });

    const gpsTrendChart = Array.from(dateCountMap.values()).map(d => {
      const res = { date: d.date };
      counts.forEach(c => {
        if (d[`${c.countCode}_count`]) {
          res[c.countCode] = Number((d[`${c.countCode}_sum`] / d[`${c.countCode}_count`]).toFixed(1));
        }
      });
      return res;
    });

    // 3. Machine Health & Statement Grid (14 frames: SP025-SP056)
    // First, calculate sister machine count averages to detect mechanical outliers (>= 5 GPS below sister machines)
    const countMachineGpsMap = new Map(); // countCode -> [actualGps]
    const machineProdMap = new Map();

    prodLogs.forEach(p => {
      if (!machineProdMap.has(p.machineNumber)) {
        machineProdMap.set(p.machineNumber, []);
      }
      machineProdMap.get(p.machineNumber).push(p);

      if (!countMachineGpsMap.has(p.countCode)) {
        countMachineGpsMap.set(p.countCode, []);
      }
      countMachineGpsMap.get(p.countCode).push(p.actualGps);
    });

    const countAvgGpsMap = new Map();
    countMachineGpsMap.forEach((gpsList, code) => {
      const avg = gpsList.reduce((a, b) => a + b, 0) / gpsList.length;
      countAvgGpsMap.set(code, avg);
    });

    const machineHealthGrid = machines.map(m => {
      const logs = machineProdMap.get(m.machineNumber) || [];
      const countCode = logs.length > 0 ? logs[0].countCode : '40s';

      const runHours = logs.length > 0 ? Number((logs.reduce((a, b) => a + (b.runHours || 0), 0) / logs.length).toFixed(1)) : 8.0;
      const stoppedHours = logs.length > 0 ? Number((logs.reduce((a, b) => a + (b.stoppedHours || 0), 0) / logs.length).toFixed(1)) : 0.0;
      const actualKg = logs.length > 0 ? Number((logs.reduce((a, b) => a + (b.productionKg || 0), 0)).toFixed(1)) : 0;
      const actualGps = logs.length > 0 ? Number((logs.reduce((a, b) => a + (b.actualGps || 0), 0) / logs.length).toFixed(2)) : 0;
      const utilizationPct = logs.length > 0 ? Number((logs.reduce((a, b) => a + (b.utilizationPct || 0), 0) / logs.length).toFixed(1)) : 0;
      const efficiencyPct = logs.length > 0 ? Number((logs.reduce((a, b) => a + (b.efficiencyPct || 0), 0) / logs.length).toFixed(1)) : 0;

      // EM details
      let emValue = 0;
      let pneumafilWaste = 0;
      let breakCount = 0;

      if (range === 'mtd') {
        const emList = emLogMap.get(m.machineNumber) || [];
        if (emList.length > 0) {
          emValue = Number((emList.reduce((a, b) => a + (b.emValue || 0), 0) / emList.length).toFixed(2));
          pneumafilWaste = Number((emList.reduce((a, b) => a + (b.pneumafilWastePct || 0), 0) / emList.length).toFixed(2));
          breakCount = Math.round(emList.reduce((a, b) => a + (b.breakCount || 0), 0) / emList.length);
        }
      } else {
        const em = emLogMap.get(`${date}_${shift}_${m.machineNumber}`);
        if (em) {
          emValue = em.emValue;
          pneumafilWaste = em.pneumafilWastePct;
          breakCount = em.breakCount;
        }
      }

      // Check mechanical outlier: frame running >= 5 GPS below sister machines on the same count
      const allSisterGps = (countMachineGpsMap.get(countCode) || []).filter(g => g !== actualGps);
      const sisterAvgGps = allSisterGps.length > 0
        ? (allSisterGps.reduce((a, b) => a + b, 0) / allSisterGps.length)
        : (countAvgGpsMap.get(countCode) || actualGps);
      const gpsDeficit = Number((sisterAvgGps - actualGps).toFixed(2));
      const isMechanicalOutlier = gpsDeficit >= 5.0;

      return {
        machineNumber: m.machineNumber,
        countCode,
        runHours,
        stoppedHours,
        actualKg,
        actualGps,
        sisterAvgGps: Number(sisterAvgGps.toFixed(2)),
        gpsDeficit,
        isMechanicalOutlier,
        utilizationPct,
        efficiencyPct,
        emValue,
        isEmOutlier: emValue > 4.0,
        pneumafilWaste,
        breakCount
      };
    });

    res.json({
      date,
      shift,
      range,
      month,
      countSummary,
      gpsTrendChart,
      machineHealthGrid,
      availableCounts: counts.map(c => c.countCode)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
