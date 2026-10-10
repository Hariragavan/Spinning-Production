import { ShiftAllocation } from '../models/ShiftAllocation.js';
import { DailyProductionLog } from '../models/DailyProductionLog.js';
import { MachineEMLog } from '../models/MachineEMLog.js';
import { IncentiveRule } from '../models/IncentiveRule.js';
import { YarnCount } from '../models/YarnCount.js';
import { Worker } from '../models/Worker.js';
import { Machine } from '../models/Machine.js';

/**
 * Match a countCode against an array of IncentiveRules
 * Checks exact match, normalized trim/case-insensitive match, and regex pattern
 */
export function matchIncentiveRule(countCode, rules) {
  if (!countCode || !rules || rules.length === 0) return null;
  const cleanCode = countCode.trim();

  // 1. Exact match
  const exact = rules.find(r => r.countPattern.trim().toLowerCase() === cleanCode.toLowerCase());
  if (exact) return exact;

  // 2. Regex test
  for (const rule of rules) {
    try {
      const reg = new RegExp(`^${rule.countPattern.trim()}$`, 'i');
      if (reg.test(cleanCode)) return rule;
    } catch {
      // ignore invalid regex patterns
    }
  }

  // 3. Partial / contains match
  const partial = rules.find(r => cleanCode.toLowerCase().includes(r.countPattern.trim().toLowerCase()) ||
                                  r.countPattern.trim().toLowerCase().includes(cleanCode.toLowerCase()));
  if (partial) return partial;

  return null;
}

/**
 * Determine payout per side based on actual GPS and rule slabs
 */
export function calculateSlabPayout(actualGps, rule) {
  if (!rule || !rule.slabs || rule.slabs.length === 0) {
    return { amountPerSide: 0, slabMatched: null, isBelowMin: true };
  }

  // Sort slabs descending by minGps
  const sortedSlabs = [...rule.slabs].sort((a, b) => b.minGps - a.minGps);

  // Find highest slab where actualGps >= minGps
  const matched = sortedSlabs.find(slab => actualGps >= slab.minGps);

  if (matched) {
    return { amountPerSide: matched.amountPerSide, slabMatched: matched, isBelowMin: false };
  }

  // Below lowest slab
  return { amountPerSide: 0, slabMatched: null, isBelowMin: true };
}

/**
 * Core Shift Incentive Calculation Engine
 */
export async function calculateShiftIncentives(date, shift) {
  // Load data concurrently
  const [allocation, prodLogs, emLogs, rules, counts, workers, machines] = await Promise.all([
    ShiftAllocation.findOne({ date, shift }).lean(),
    DailyProductionLog.find({ date, shift }).lean(),
    MachineEMLog.find({ date, shift }).lean(),
    IncentiveRule.find().lean(),
    YarnCount.find().lean(),
    Worker.find().lean(),
    Machine.find({ isActive: true }).sort({ displayOrder: 1, machineNumber: 1 }).lean()
  ]);

  const prodLogMap = new Map();
  prodLogs.forEach(p => prodLogMap.set(p.machineNumber, p));

  const emLogMap = new Map();
  emLogs.forEach(e => emLogMap.set(e.machineNumber, e));

  const countMap = new Map();
  counts.forEach(c => countMap.set(c.countCode, c));

  const workerMap = new Map();
  workers.forEach(w => workerMap.set(w.tokenNumber, w));

  const allocationsList = allocation?.allocations || [];

  // Track audits and collisions
  const auditAlerts = [];
  const assignedSideKeys = new Set();
  const workerSideCounts = new Map();

  allocationsList.forEach(alloc => {
    if (alloc.workerToken) {
      const key = `${alloc.machineNumber}-${alloc.side}`;
      if (assignedSideKeys.has(key)) {
        auditAlerts.push({
          type: 'COLLISION',
          severity: 'DANGER',
          message: `Side Collision: Machine ${alloc.machineNumber} side ${alloc.side} assigned multiple times.`
        });
      }
      assignedSideKeys.add(key);

      const currentCount = workerSideCounts.get(alloc.workerToken) || 0;
      workerSideCounts.set(alloc.workerToken, currentCount + 1);
    }
  });

  // Check excessive workload (> 4 sides = > 200%)
  workerSideCounts.forEach((count, token) => {
    if (count > 4) {
      const w = workerMap.get(token);
      auditAlerts.push({
        type: 'EXCESSIVE_WORKLOAD',
        severity: 'DANGER',
        message: `Excessive Workload: Sider ${w ? w.name : token} (Token ${token}) assigned to ${count} sides (${count * 50}%). Maximum recommended is 4 sides (200%).`
      });
    }
  });

  // Check unassigned sides across active machines
  machines.forEach(m => {
    ['LH', 'RH'].forEach(side => {
      const found = allocationsList.find(a => a.machineNumber === m.machineNumber && a.side === side && a.workerToken);
      if (!found) {
        auditAlerts.push({
          type: 'UNASSIGNED_SIDE',
          severity: 'WARNING',
          message: `Unassigned Side: Machine ${m.machineNumber} ${side} is currently unallocated.`
        });
      }
    });
  });

  // Detail breakdown for each machine side
  const sideResults = [];
  const workerAccumulator = new Map();

  // Initialize accumulators for all workers assigned
  workerSideCounts.forEach((_, token) => {
    const w = workerMap.get(token);
    workerAccumulator.set(token, {
      tokenNumber: token,
      name: w ? w.name : `Unknown (${token})`,
      department: w?.department || 'SIDER',
      avatarUrl: w?.avatarUrl || null,
      sidesCount: 0,
      workloadPct: 0,
      totalIncentive: 0,
      assignedSides: [],
      gpsRecords: [],
      emRecords: [],
      isOverworked: false,
      hasRuleMissing: false,
      hasEmOutlier: false
    });
  });

  // Evaluate each allocation
  for (const alloc of allocationsList) {
    const machineNumber = alloc.machineNumber;
    const side = alloc.side;
    const workerToken = alloc.workerToken;

    const prod = prodLogMap.get(machineNumber);
    const em = emLogMap.get(machineNumber);
    const countInfo = prod ? countMap.get(prod.countCode) : null;
    const factorTo40s = countInfo?.factorTo40s || 1.0;

    const countCode = prod?.countCode || 'UNKNOWN';
    const actualGps = prod?.actualGps || 0;
    const converted40sGps = actualGps > 0 ? Number((actualGps * factorTo40s).toFixed(2)) : 0;
    const emValue = em?.emValue ?? 0;

    let ruleMissing = false;
    let amountPerSide = 0;
    let slabMatched = null;

    if (prod && prod.countCode) {
      const rule = matchIncentiveRule(prod.countCode, rules);
      if (!rule) {
        ruleMissing = true;
        auditAlerts.push({
          type: 'RULE_MISSING',
          severity: 'DANGER',
          message: `⚠️ RULE MISSING: Machine ${machineNumber} running count '${prod.countCode}' has no matching incentive rule in master.`
        });
      } else {
        const payout = calculateSlabPayout(actualGps, rule);
        amountPerSide = payout.amountPerSide;
        slabMatched = payout.slabMatched;
      }
    }

    const sideIncentive = workerToken ? amountPerSide : 0;
    const isEmOutlier = emValue > 4.0;

    if (isEmOutlier) {
      auditAlerts.push({
        type: 'EM_ALERT',
        severity: 'DANGER',
        message: `Quality Alert: Machine ${machineNumber} EM value is ${emValue} (> 4.0 threshold).`
      });
    }

    sideResults.push({
      machineNumber,
      side,
      workerToken,
      workerName: workerToken ? (workerMap.get(workerToken)?.name || workerToken) : 'Unassigned',
      countCode,
      actualGps,
      converted40sGps,
      productionKg: prod?.productionKg || 0,
      efficiencyPct: prod?.efficiencyPct || 0,
      utilizationPct: prod?.utilizationPct || 0,
      runHours: prod?.runHours ?? 8.0,
      emValue,
      breakCount: em?.breakCount || 0,
      amountPerSide,
      sideIncentive,
      ruleMissing,
      slabMatched,
      isEmOutlier
    });

    if (workerToken && workerAccumulator.has(workerToken)) {
      const acc = workerAccumulator.get(workerToken);
      acc.sidesCount += 1;
      acc.workloadPct = acc.sidesCount * 50;
      acc.totalIncentive += sideIncentive;
      acc.assignedSides.push({
        machineNumber,
        side,
        countCode,
        actualGps,
        sideIncentive,
        amountPerSide,
        ruleMissing,
        emValue
      });
      if (actualGps > 0) acc.gpsRecords.push(actualGps);
      if (emValue > 0) acc.emRecords.push(emValue);
      if (ruleMissing) acc.hasRuleMissing = true;
      if (isEmOutlier) acc.hasEmOutlier = true;
      if (acc.sidesCount > 4) acc.isOverworked = true;
    }
  }

  // Format worker rollups
  const workerRollup = Array.from(workerAccumulator.values()).map(acc => {
    const avgGps = acc.gpsRecords.length > 0
      ? Number((acc.gpsRecords.reduce((a, b) => a + b, 0) / acc.gpsRecords.length).toFixed(2))
      : 0;
    const avgEm = acc.emRecords.length > 0
      ? Number((acc.emRecords.reduce((a, b) => a + b, 0) / acc.emRecords.length).toFixed(2))
      : 0;

    return {
      ...acc,
      avgGps,
      avgEm,
      totalIncentive: Math.round(acc.totalIncentive)
    };
  }).sort((a, b) => b.totalIncentive - a.totalIncentive);

  // Overall Shift KPI metrics
  const totalProductionKg = prodLogs.reduce((acc, p) => acc + (p.productionKg || 0), 0);
  const avgEfficiency = prodLogs.length > 0
    ? Number((prodLogs.reduce((acc, p) => acc + (p.efficiencyPct || 0), 0) / prodLogs.length).toFixed(1))
    : 0;
  const avgUtilization = prodLogs.length > 0
    ? Number((prodLogs.reduce((acc, p) => acc + (p.utilizationPct || 0), 0) / prodLogs.length).toFixed(1))
    : 0;

  // 40s Standard Count Average
  const convertedGpsList = prodLogs.map(p => {
    const c = countMap.get(p.countCode);
    const factor = c?.factorTo40s || 1.0;
    return (p.actualGps || 0) * factor;
  }).filter(v => v > 0);

  const avg40sGps = convertedGpsList.length > 0
    ? Number((convertedGpsList.reduce((a, b) => a + b, 0) / convertedGpsList.length).toFixed(2))
    : 0;

  const totalIncentive = workerRollup.reduce((acc, w) => acc + w.totalIncentive, 0);

  // Deduplicate audit alerts
  const uniqueAlerts = [];
  const seenMessages = new Set();
  for (const a of auditAlerts) {
    if (!seenMessages.has(a.message)) {
      seenMessages.add(a.message);
      uniqueAlerts.push(a);
    }
  }

  return {
    date,
    shift,
    gaiterToken: allocation?.gaiterToken || null,
    gaiterName: allocation?.gaiterToken ? (workerMap.get(allocation.gaiterToken)?.name || allocation.gaiterToken) : null,
    isLocked: allocation?.isLocked || false,
    kpis: {
      totalProductionKg: Number(totalProductionKg.toFixed(1)),
      avgEfficiency,
      avgUtilization,
      avg40sGps,
      activeMachinesCount: prodLogs.length,
      totalWorkers: workerRollup.length,
      totalIncentive,
      unassignedSidesCount: uniqueAlerts.filter(a => a.type === 'UNASSIGNED_SIDE').length,
      missingRulesCount: uniqueAlerts.filter(a => a.type === 'RULE_MISSING').length,
      emOutliersCount: uniqueAlerts.filter(a => a.type === 'EM_ALERT').length,
      collisionsCount: uniqueAlerts.filter(a => a.type === 'COLLISION').length
    },
    auditAlerts: uniqueAlerts,
    workerRollup,
    sideResults
  };
}
