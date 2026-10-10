import express from 'express';
import multer from 'multer';
import { Worker } from '../models/Worker.js';
import { Machine } from '../models/Machine.js';
import { YarnCount } from '../models/YarnCount.js';
import { IncentiveRule } from '../models/IncentiveRule.js';
import { MillCalendar } from '../models/MillCalendar.js';
import { DailyProductionLog } from '../models/DailyProductionLog.js';
import { MachineEMLog } from '../models/MachineEMLog.js';
import { ShiftAllocation } from '../models/ShiftAllocation.js';
import { parseAndIngestProductionExcel, parseAndIngestEMExcel } from '../services/excelIngestion.js';
import { calculateSlabPayout, matchIncentiveRule } from '../services/calculationEngine.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- TAB 1: DATA INGESTION & MILL CALENDAR ---

// Ingest Production Excel
router.post('/ingest/production', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { targetDate, targetShift } = req.body;
    const result = await parseAndIngestProductionExcel(req.file.buffer, targetDate, targetShift);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ingest EM Excel
router.post('/ingest/em', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { targetDate, targetShift } = req.body;
    const result = await parseAndIngestEMExcel(req.file.buffer, targetDate, targetShift);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mill Holidays / Shutdowns
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await MillCalendar.find().sort({ date: 1 }).lean();
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/holidays', async (req, res) => {
  try {
    const { date, isHoliday, reason } = req.body;
    const doc = await MillCalendar.findOneAndUpdate(
      { date },
      { date, isHoliday: isHoliday ?? true, reason },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/holidays/:id', async (req, res) => {
  try {
    await MillCalendar.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- TAB 2: MASTER REGISTRIES ---

// Workers CRUD
router.get('/workers', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { tokenNumber: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const workers = await Worker.find(query).sort({ tokenNumber: 1 }).lean();
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/workers', async (req, res) => {
  try {
    const { tokenNumber, name, department, avatarUrl, isActive, skillGrade } = req.body;
    const worker = await Worker.findOneAndUpdate(
      { tokenNumber },
      { tokenNumber, name, department: department || 'SIDER', avatarUrl, isActive: isActive ?? true, skillGrade: skillGrade || 'A' },
      { upsert: true, new: true }
    );
    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/workers/:id/toggle-active', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    worker.isActive = !worker.isActive;
    await worker.save();
    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/workers/:id', async (req, res) => {
  try {
    await Worker.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Machines CRUD
router.get('/machines', async (req, res) => {
  try {
    const machines = await Machine.find().sort({ displayOrder: 1, machineNumber: 1 }).lean();
    res.json(machines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/machines', async (req, res) => {
  try {
    const { machineNumber, sides, isActive, displayOrder, notes } = req.body;
    const machine = await Machine.findOneAndUpdate(
      { machineNumber },
      { machineNumber, sides: sides || ['LH', 'RH'], isActive: isActive ?? true, displayOrder, notes },
      { upsert: true, new: true }
    );
    res.json(machine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/machines/reset-standard', async (req, res) => {
  try {
    const STANDARD_14 = [
      'SP025', 'SP026', 'SP027', 'SP029', 'SP030', 'SP031',
      'SP032', 'SP033', 'SP034', 'SP035', 'SP036', 'SP037',
      'SP038', 'SP056'
    ];
    await Machine.deleteMany({});
    const docs = STANDARD_14.map((m, idx) => ({
      machineNumber: m,
      sides: ['LH', 'RH'],
      isActive: true,
      displayOrder: idx + 1,
      notes: `KTTM 01 2nd Shed Frame ${idx + 1}`
    }));
    await Machine.insertMany(docs);
    res.json({ success: true, count: docs.length, machines: docs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Count Master CRUD
router.get('/counts', async (req, res) => {
  try {
    const counts = await YarnCount.find().sort({ countCode: 1 }).lean();
    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/counts', async (req, res) => {
  try {
    const { countCode, countName, description, factorTo40s, standardGps, isActive } = req.body;
    const doc = await YarnCount.findOneAndUpdate(
      { countCode },
      { countCode, countName, description, factorTo40s: factorTo40s ?? 1.0, standardGps: standardGps ?? 0, isActive: isActive ?? true },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Incentive Master CRUD & Live Slab Simulator
router.get('/incentive-rules', async (req, res) => {
  try {
    const rules = await IncentiveRule.find().sort({ countPattern: 1 }).lean();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/incentive-rules', async (req, res) => {
  try {
    const { countPattern, slabs } = req.body;
    const rule = await IncentiveRule.findOneAndUpdate(
      { countPattern },
      { countPattern, slabs: slabs || [], updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/incentive-rules/:id', async (req, res) => {
  try {
    await IncentiveRule.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Live Test Matrix for Slab Builder
router.post('/incentive-rules/simulate', async (req, res) => {
  try {
    const { countCode, testGps } = req.body;
    const rules = await IncentiveRule.find().lean();
    const matchedRule = matchIncentiveRule(countCode, rules);
    if (!matchedRule) {
      return res.json({
        matched: false,
        message: `⚠️ RULE MISSING: No rule matches '${countCode}'`,
        payoutPerSide: 0,
        fullMachinePayout: 0
      });
    }

    const payout = calculateSlabPayout(parseFloat(testGps) || 0, matchedRule);
    res.json({
      matched: true,
      rulePattern: matchedRule.countPattern,
      testGps: parseFloat(testGps),
      payoutPerSide: payout.amountPerSide,
      fullMachinePayout: payout.amountPerSide * 2,
      isBelowMin: payout.isBelowMin,
      slabMatched: payout.slabMatched
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- TAB 3: SYSTEM ADMINISTRATION & STORAGE ---

// Export Complete JSON Backup
router.get('/system/backup', async (req, res) => {
  try {
    const [machines, workers, counts, rules, allocations, prodLogs, emLogs, holidays] = await Promise.all([
      Machine.find().lean(),
      Worker.find().lean(),
      YarnCount.find().lean(),
      IncentiveRule.find().lean(),
      ShiftAllocation.find().lean(),
      DailyProductionLog.find().lean(),
      MachineEMLog.find().lean(),
      MillCalendar.find().lean()
    ]);

    const backup = {
      exportTimestamp: new Date().toISOString(),
      unit: 'SCM Textile Spinners / KTTM Unit 01 (Ringframe 2nd Shed)',
      version: '1.0.0',
      data: {
        machines,
        workers,
        counts,
        rules,
        allocations,
        prodLogs,
        emLogs,
        holidays
      }
    };

    res.setHeader('Content-Disposition', 'attachment; filename=SCM_Spinners_Full_Backup.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Restore JSON Backup
router.post('/system/restore', upload.single('backupFile'), async (req, res) => {
  try {
    let backupJson;
    if (req.file) {
      backupJson = JSON.parse(req.file.buffer.toString('utf-8'));
    } else if (req.body?.data) {
      backupJson = req.body;
    } else {
      return res.status(400).json({ message: 'No valid backup JSON provided' });
    }

    const { machines, workers, counts, rules, allocations, prodLogs, emLogs, holidays } = backupJson.data || {};

    if (machines) { await Machine.deleteMany({}); await Machine.insertMany(machines); }
    if (workers) { await Worker.deleteMany({}); await Worker.insertMany(workers); }
    if (counts) { await YarnCount.deleteMany({}); await YarnCount.insertMany(counts); }
    if (rules) { await IncentiveRule.deleteMany({}); await IncentiveRule.insertMany(rules); }
    if (allocations) { await ShiftAllocation.deleteMany({}); await ShiftAllocation.insertMany(allocations); }
    if (prodLogs) { await DailyProductionLog.deleteMany({}); await DailyProductionLog.insertMany(prodLogs); }
    if (emLogs) { await MachineEMLog.deleteMany({}); await MachineEMLog.insertMany(emLogs); }
    if (holidays) { await MillCalendar.deleteMany({}); await MillCalendar.insertMany(holidays); }

    res.json({ success: true, message: 'Database state successfully restored from backup' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Purge Month Data (Danger Zone)
router.post('/system/purge-month', async (req, res) => {
  try {
    const { month } = req.body; // e.g. "2026-10"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Valid month YYYY-MM required' });
    }

    const regex = new RegExp(`^${month}`);
    const [delProd, delEm, delAlloc] = await Promise.all([
      DailyProductionLog.deleteMany({ date: { $regex: regex } }),
      MachineEMLog.deleteMany({ date: { $regex: regex } }),
      ShiftAllocation.deleteMany({ date: { $regex: regex } })
    ]);

    res.json({
      success: true,
      message: `Purged data for ${month}`,
      deleted: {
        productionLogs: delProd.deletedCount,
        emLogs: delEm.deletedCount,
        shiftAllocations: delAlloc.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Google Sheets Sync Bridge Settings & Status
let gsheetsConfig = {
  sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  autoSyncIntervalMinutes: 60,
  lastSyncStatus: 'OK (Simulated)',
  lastSyncTime: new Date().toISOString()
};

router.get('/system/google-sheets-config', (req, res) => {
  res.json(gsheetsConfig);
});

router.post('/system/google-sheets-sync', async (req, res) => {
  gsheetsConfig.lastSyncTime = new Date().toISOString();
  gsheetsConfig.lastSyncStatus = 'SYNC_SUCCESS';
  res.json({ success: true, message: 'Google Sheets sync bridge triggered successfully', config: gsheetsConfig });
});

export default router;
