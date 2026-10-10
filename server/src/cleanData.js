import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { DailyProductionLog } from './models/DailyProductionLog.js';
import { MachineEMLog } from './models/MachineEMLog.js';
import { ShiftAllocation } from './models/ShiftAllocation.js';
import { YarnCount } from './models/YarnCount.js';
import { IncentiveRule } from './models/IncentiveRule.js';

dotenv.config();

export async function clearAllTelemetryData() {
  await connectDB();
  console.log('[Clean Data] Purging all seeded shift telemetry, EM logs, and allocations...');

  const delProd = await DailyProductionLog.deleteMany({});
  const delEm = await MachineEMLog.deleteMany({});
  const delAlloc = await ShiftAllocation.deleteMany({});

  console.log(`[Clean Data] Cleared ${delProd.deletedCount} DailyProductionLog records.`);
  console.log(`[Clean Data] Cleared ${delEm.deletedCount} MachineEMLog records.`);
  console.log(`[Clean Data] Cleared ${delAlloc.deletedCount} ShiftAllocation records.`);

  // Ensure all count codes found in the official SCM spreadsheet exist in YarnCount & IncentiveRule masters
  const SCM_ADDITIONAL_COUNTS = [
    { countCode: '20/1-CW-WVG', countName: '20/1 Carded Weaving', factorTo40s: 0.50, standardGps: 135.0 },
    { countCode: '24/1-CH-SY', countName: '24/1 Carded Hosiery Special', factorTo40s: 0.60, standardGps: 115.0 },
    { countCode: '30/1-CW-SY', countName: '30/1 Carded Weaving Special', factorTo40s: 0.75, standardGps: 94.0 },
    { countCode: '30/1-VH-CV', countName: '30/1 Viscose Hosiery', factorTo40s: 0.75, standardGps: 96.0 },
    { countCode: '32/1-CW-SY', countName: '32/1 Carded Weaving Special', factorTo40s: 0.80, standardGps: 88.0 },
    { countCode: '34/1-VH-CV', countName: '34/1 Viscose Hosiery', factorTo40s: 0.85, standardGps: 86.0 },
    { countCode: '34/1-PH-PV', countName: '34/1 Poly Viscose', factorTo40s: 0.85, standardGps: 86.0 },
    { countCode: '44/1-PH-PC', countName: '44/1 Poly Cotton Fine', factorTo40s: 1.10, standardGps: 65.0 },
    { countCode: '030/1-PH-PC', countName: '30/1 Poly Cotton', factorTo40s: 0.75, standardGps: 95.0 },
    { countCode: '031/1-CH-CY', countName: '31/1 Carded Hosiery', factorTo40s: 0.78, standardGps: 92.0 },
    { countCode: '040/1-PH-PC', countName: '40/1 Poly Cotton', factorTo40s: 1.00, standardGps: 72.0 }
  ];

  for (const c of SCM_ADDITIONAL_COUNTS) {
    await YarnCount.findOneAndUpdate(
      { countCode: c.countCode },
      { countCode: c.countCode, countName: c.countName, factorTo40s: c.factorTo40s, standardGps: c.standardGps, isActive: true },
      { upsert: true }
    );

    // Slabs for each count
    const minBase = Math.round(c.standardGps * 0.92);
    await IncentiveRule.findOneAndUpdate(
      { countPattern: c.countCode },
      {
        countPattern: c.countCode,
        slabs: [
          { minGps: minBase, amountPerSide: 75 },
          { minGps: minBase + 4, amountPerSide: 85 },
          { minGps: minBase + 8, amountPerSide: 95 },
          { minGps: minBase + 12, amountPerSide: 105 },
          { minGps: minBase + 16, amountPerSide: 115 }
        ]
      },
      { upsert: true }
    );
  }

  console.log('[Clean Data] Clean slate ready! All mock data removed. The platform is ready for real user Excel uploads.');
}

if (process.argv[1]?.endsWith('cleanData.js')) {
  clearAllTelemetryData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
