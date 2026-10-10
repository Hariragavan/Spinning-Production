import express from 'express';
import { calculateShiftIncentives } from '../services/calculationEngine.js';
import { getMonthlyPayrollData } from '../services/payrollEngine.js';
import { DailyProductionLog } from '../models/DailyProductionLog.js';
import { Machine } from '../models/Machine.js';
import { YarnCount } from '../models/YarnCount.js';

const router = express.Router();

router.get('/live', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const date = req.query.date || '2026-10-10'; // default to seeded today
    const shift = req.query.shift || 'I';
    const month = date.slice(0, 7);

    const [shiftData, monthlyData, machines, counts] = await Promise.all([
      calculateShiftIncentives(date, shift),
      getMonthlyPayrollData(month),
      Machine.find({ isActive: true }).sort({ displayOrder: 1, machineNumber: 1 }).lean(),
      YarnCount.find({ isActive: true }).lean()
    ]);

    // Count distribution
    const countDist = {};
    shiftData.sideResults.forEach(s => {
      if (s.countCode && s.countCode !== 'UNKNOWN') {
        countDist[s.countCode] = (countDist[s.countCode] || 0) + 0.5; // each side = 0.5 machine
      }
    });

    const handoverSnapshot = {
      date,
      shift,
      gaiterName: shiftData.gaiterName || 'Not Assigned',
      isLocked: shiftData.isLocked,
      countDistribution: Object.entries(countDist).map(([count, frames]) => ({
        count,
        frames: Number(frames.toFixed(1))
      })),
      unassignedSides: shiftData.sideResults.filter(s => !s.workerToken),
      emOutliers: shiftData.sideResults.filter(s => s.isEmOutlier),
      missingRules: shiftData.sideResults.filter(s => s.ruleMissing)
    };

    res.json({
      date,
      shift,
      kpis: shiftData.kpis,
      handoverSnapshot,
      auditAlerts: shiftData.auditAlerts,
      top6Siders: monthlyData.top6Siders,
      syncStatus: {
        cloudActive: true,
        lastSyncTime: new Date().toLocaleTimeString(),
        pendingSyncCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/tv-signage', async (req, res) => {
  try {
    const date = req.query.date || '2026-10-10';
    const shift = req.query.shift || 'I';
    const month = date.slice(0, 7);

    const [shiftData, monthlyData, counts] = await Promise.all([
      calculateShiftIncentives(date, shift),
      getMonthlyPayrollData(month),
      YarnCount.find({ isActive: true }).lean()
    ]);

    // Group machines by machineNumber
    const machineMap = new Map();
    shiftData.sideResults.forEach(sr => {
      if (!machineMap.has(sr.machineNumber)) {
        machineMap.set(sr.machineNumber, {
          machineNumber: sr.machineNumber,
          countCode: sr.countCode,
          actualGps: sr.actualGps,
          converted40sGps: sr.converted40sGps,
          efficiencyPct: sr.efficiencyPct,
          utilizationPct: sr.utilizationPct,
          productionKg: sr.productionKg,
          emValue: sr.emValue,
          isEmOutlier: sr.isEmOutlier,
          sides: []
        });
      }
      machineMap.get(sr.machineNumber).sides.push({
        side: sr.side,
        workerToken: sr.workerToken,
        workerName: sr.workerName,
        sideIncentive: sr.sideIncentive,
        ruleMissing: sr.ruleMissing
      });
    });

    // Count delivery summary
    const countStdMap = new Map(counts.map(c => [c.countCode, c.standardGps]));
    const countStats = {};
    shiftData.sideResults.forEach(sr => {
      if (!sr.countCode || sr.countCode === 'UNKNOWN') return;
      if (!countStats[sr.countCode]) {
        countStats[sr.countCode] = {
          countCode: sr.countCode,
          standardGps: countStdMap.get(sr.countCode) || 0,
          gpsList: [],
          totalKg: 0,
          sidesCount: 0
        };
      }
      countStats[sr.countCode].sidesCount++;
      if (sr.actualGps > 0) countStats[sr.countCode].gpsList.push(sr.actualGps);
      countStats[sr.countCode].totalKg += (sr.productionKg / 2); // 2 sides per machine
    });

    const runningCountTrends = Object.values(countStats).map(c => {
      const avgGps = c.gpsList.length > 0 ? Number((c.gpsList.reduce((a, b) => a + b, 0) / c.gpsList.length).toFixed(1)) : 0;
      const variance = Number((avgGps - c.standardGps).toFixed(1));
      return {
        countCode: c.countCode,
        runningFrames: Number((c.sidesCount / 2).toFixed(1)),
        standardGps: c.standardGps,
        actualGps: avgGps,
        variance,
        totalKg: Number(c.totalKg.toFixed(1))
      };
    });

    res.json({
      date,
      shift,
      kpis: shiftData.kpis,
      slide1_overview: {
        millName: 'SCM Textile Spinners',
        unit: 'KTTM Unit 01 (Ringframe 2nd Shed)',
        shift,
        date,
        kpis: shiftData.kpis,
        totalProductionKg: shiftData.kpis.totalProductionKg,
        avgEfficiency: shiftData.kpis.avgEfficiency,
        avgUtilization: shiftData.kpis.avgUtilization,
        avg40sGps: shiftData.kpis.avg40sGps,
        totalIncentiveDisbursed: shiftData.kpis.totalIncentive
      },
      slide2_machines: Array.from(machineMap.values()),
      slide3_countTrends: runningCountTrends,
      slide4_hallOfFame: monthlyData.top6Siders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
