import express from 'express';
import { ShiftAllocation } from '../models/ShiftAllocation.js';
import { Machine } from '../models/Machine.js';
import { Worker } from '../models/Worker.js';
import { calculateShiftIncentives } from '../services/calculationEngine.js';

const router = express.Router();

// Get Allocation Roster and details
router.get('/roster', async (req, res) => {
  try {
    const date = req.query.date || '2026-10-10';
    const shift = req.query.shift || 'I';

    const [machines, workers, allocation, calculation] = await Promise.all([
      Machine.find({ isActive: true }).sort({ displayOrder: 1, machineNumber: 1 }).lean(),
      Worker.find({ isActive: true }).sort({ tokenNumber: 1 }).lean(),
      ShiftAllocation.findOne({ date, shift }).lean(),
      calculateShiftIncentives(date, shift)
    ]);

    // Map existing allocations by machineNumber_side
    const allocMap = new Map();
    if (allocation?.allocations) {
      allocation.allocations.forEach(a => {
        allocMap.set(`${a.machineNumber}_${a.side}`, a.workerToken);
      });
    }

    // Build grid structure for 14 machines
    const machineGrid = machines.map(m => {
      const lhWorker = allocMap.get(`${m.machineNumber}_LH`) || null;
      const rhWorker = allocMap.get(`${m.machineNumber}_RH`) || null;

      // Find calculation details
      const lhCalc = calculation.sideResults.find(s => s.machineNumber === m.machineNumber && s.side === 'LH');
      const rhCalc = calculation.sideResults.find(s => s.machineNumber === m.machineNumber && s.side === 'RH');

      return {
        machineNumber: m.machineNumber,
        notes: m.notes,
        countCode: lhCalc?.countCode || '40s',
        actualGps: lhCalc?.actualGps || 0,
        emValue: lhCalc?.emValue || 0,
        isEmOutlier: lhCalc?.isEmOutlier || false,
        LH: {
          side: 'LH',
          workerToken: lhWorker,
          workerName: lhWorker ? (workers.find(w => w.tokenNumber === lhWorker)?.name || lhWorker) : null,
          incentive: lhCalc?.sideIncentive || 0,
          ruleMissing: lhCalc?.ruleMissing || false
        },
        RH: {
          side: 'RH',
          workerToken: rhWorker,
          workerName: rhWorker ? (workers.find(w => w.tokenNumber === rhWorker)?.name || rhWorker) : null,
          incentive: rhCalc?.sideIncentive || 0,
          ruleMissing: rhCalc?.ruleMissing || false
        }
      };
    });

    res.json({
      date,
      shift,
      gaiterToken: allocation?.gaiterToken || null,
      isLocked: allocation?.isLocked || false,
      supervisorId: allocation?.supervisorId || null,
      machineGrid,
      workers,
      calculationSummary: {
        kpis: calculation.kpis,
        auditAlerts: calculation.auditAlerts,
        workerRollup: calculation.workerRollup
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save or Update Single Side Allocation
router.post('/assign-side', async (req, res) => {
  try {
    const { date, shift, machineNumber, side, workerToken } = req.body;

    let allocation = await ShiftAllocation.findOne({ date, shift });
    if (!allocation) {
      allocation = new ShiftAllocation({
        date,
        shift,
        allocations: []
      });
    }

    if (allocation.isLocked) {
      return res.status(403).json({ message: 'Shift is locked. Unlock to make modifications.' });
    }

    // Find and update side or push
    const idx = allocation.allocations.findIndex(a => a.machineNumber === machineNumber && a.side === side);
    if (idx >= 0) {
      allocation.allocations[idx].workerToken = workerToken || null;
    } else {
      allocation.allocations.push({ machineNumber, side, workerToken: workerToken || null });
    }

    await allocation.save();

    // Recalculate and return
    const calculation = await calculateShiftIncentives(date, shift);
    res.json({ success: true, calculation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Entire Allocation Roster
router.post('/save-roster', async (req, res) => {
  try {
    const { date, shift, gaiterToken, allocations } = req.body;

    const allocation = await ShiftAllocation.findOneAndUpdate(
      { date, shift },
      {
        date,
        shift,
        gaiterToken: gaiterToken || null,
        allocations: allocations || []
      },
      { upsert: true, new: true }
    );

    const calculation = await calculateShiftIncentives(date, shift);
    res.json({ success: true, allocation, calculation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Batch Action: Copy From Previous Shift
router.post('/copy-previous', async (req, res) => {
  try {
    const { date, shift } = req.body;

    // Determine previous shift
    let prevDate = date;
    let prevShift = 'I';
    if (shift === 'III') prevShift = 'II';
    else if (shift === 'II') prevShift = 'I';
    else {
      // Previous day Shift III
      const d = new Date(date);
      d.setDate(d.getDate() - 1);
      prevDate = d.toISOString().split('T')[0];
      prevShift = 'III';
    }

    const previousAllocation = await ShiftAllocation.findOne({ date: prevDate, shift: prevShift });
    if (!previousAllocation || !previousAllocation.allocations.length) {
      return res.status(404).json({ message: `No prior allocation found for ${prevDate} Shift ${prevShift}` });
    }

    const newAllocation = await ShiftAllocation.findOneAndUpdate(
      { date, shift },
      {
        date,
        shift,
        gaiterToken: previousAllocation.gaiterToken,
        allocations: previousAllocation.allocations
      },
      { upsert: true, new: true }
    );

    const calculation = await calculateShiftIncentives(date, shift);
    res.json({
      success: true,
      message: `Successfully copied allocations from ${prevDate} Shift ${prevShift}`,
      allocation: newAllocation,
      calculation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Batch Action: Clear Roster
router.post('/clear-roster', async (req, res) => {
  try {
    const { date, shift } = req.body;
    await ShiftAllocation.findOneAndUpdate(
      { date, shift },
      { allocations: [], gaiterToken: null },
      { upsert: true }
    );
    const calculation = await calculateShiftIncentives(date, shift);
    res.json({ success: true, message: 'Roster cleared', calculation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Batch Action: Bulk Auto-Allocate
router.post('/auto-allocate', async (req, res) => {
  try {
    const { date, shift } = req.body;
    const machines = await Machine.find({ isActive: true }).sort({ displayOrder: 1, machineNumber: 1 });
    const workers = await Worker.find({ isActive: true }).sort({ tokenNumber: 1 });

    if (workers.length < machines.length) {
      return res.status(400).json({ message: 'Not enough active workers for auto-allocation' });
    }

    // Allocate 1 worker per machine (2 sides = 100% workload)
    const allocations = [];
    machines.forEach((m, idx) => {
      const worker = workers[idx % workers.length];
      allocations.push({ machineNumber: m.machineNumber, side: 'LH', workerToken: worker.tokenNumber });
      allocations.push({ machineNumber: m.machineNumber, side: 'RH', workerToken: worker.tokenNumber });
    });

    const gaiterToken = workers[machines.length % workers.length]?.tokenNumber || null;

    const allocation = await ShiftAllocation.findOneAndUpdate(
      { date, shift },
      { date, shift, gaiterToken, allocations },
      { upsert: true, new: true }
    );

    const calculation = await calculateShiftIncentives(date, shift);
    res.json({ success: true, message: 'Auto-allocation generated (100% workload per frame)', allocation, calculation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle Lock
router.post('/toggle-lock', async (req, res) => {
  try {
    const { date, shift, isLocked } = req.body;
    const alloc = await ShiftAllocation.findOneAndUpdate(
      { date, shift },
      { isLocked },
      { new: true }
    );
    res.json({ success: true, isLocked: alloc?.isLocked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Live Preview of Shift Incentives
router.get('/preview-incentive', async (req, res) => {
  try {
    const { date, shift } = req.query;
    const calculation = await calculateShiftIncentives(date || '2026-10-10', shift || 'I');
    res.json(calculation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
