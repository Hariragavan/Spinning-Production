import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { Machine } from './models/Machine.js';
import { Worker } from './models/Worker.js';
import { YarnCount } from './models/YarnCount.js';
import { IncentiveRule } from './models/IncentiveRule.js';
import { ShiftAllocation } from './models/ShiftAllocation.js';
import { DailyProductionLog } from './models/DailyProductionLog.js';
import { MachineEMLog } from './models/MachineEMLog.js';
import { MillCalendar } from './models/MillCalendar.js';
import { User } from './models/User.js';

dotenv.config();

// 14 Machines exactly as specified
const SEED_MACHINES = [
  'SP025', 'SP026', 'SP027', 'SP029', 'SP030', 'SP031',
  'SP032', 'SP033', 'SP034', 'SP035', 'SP036', 'SP037',
  'SP038', 'SP056'
];

// 71 Authentic Sider names & tokens
const SIDER_NAMES = [
  "Murugesan K", "Palanisamy R", "Kavitha M", "Selvam P", "Lakshmi S",
  "Saravanan V", "Chitra N", "Karthik B", "Anitha R", "Suresh Kumar T",
  "Vennila M", "Dhanalakshmi G", "Ramesh Babu A", "Kalaiselvi P", "Manikandan S",
  "Revathi K", "Sangeetha R", "Ganesan M", "Sumathi V", "Prakash S",
  "Banumathi C", "Velmurugan P", "Meenakshi S", "Senthil Nathan K", "Deepa T",
  "Vijayalakshmi R", "Mohanraj N", "Kalaivani M", "Thirupathi R", "Suganya K",
  "Balamurugan S", "Usha Rani V", "Sathish Kumar M", "Vimala P", "Rajendran A",
  "Kanimozhi D", "Subramaniam K", "Amutha S", "Thangavel P", "Bhuvaneshwari M",
  "Sivakumar R", "Sasikala N", "Nagaraj V", "Devi K", "Gopalakrishnan S",
  "Mallika P", "Kannan M", "Indirani R", "Arun Kumar S", "Gomathi T",
  "Venkatesan K", "Parvathi M", "Shanmugam P", "Saraswathi R", "Dhandapani A",
  "Kaviyarasi V", "Marimuthu S", "Jayalakshmi K", "Ramasamy N", "Punitha M",
  "Periasamy P", "Latha R", "Govindaraj T", "Vijay S", "Shanthi K",
  "Nithya M", "Ayyappan R", "Radha V", "Chandran P", "Sundari S",
  "Muruganandam K"
];

// Generate 71 unique tokens
const SEED_WORKERS = SIDER_NAMES.map((name, index) => {
  let token;
  if (index === 0) token = '8937';
  else if (index === 1) token = '24151';
  else if (index === 2) token = '70152';
  else token = String(10000 + (index * 137) + (index % 7));

  return {
    tokenNumber: token,
    name,
    department: 'SIDER',
    isActive: true,
    hireDate: new Date(2021, index % 12, (index % 25) + 1),
    skillGrade: index < 15 ? 'Specialist' : index < 45 ? 'A' : 'B'
  };
});

// Yarn counts
const SEED_COUNTS = [
  { countCode: '40s', countName: '40s Carded Warp', description: 'Standard 40s yarn', factorTo40s: 1.0000, standardGps: 72.0 },
  { countCode: '34/1-CH-NY', countName: '34/1 Combed Hosiery', description: 'Premium knitting yarn', factorTo40s: 0.8500, standardGps: 85.0 },
  { countCode: '26/1-CH-CY', countName: '26/1 Carded Hosiery', description: 'High delivery coarse count', factorTo40s: 0.6500, standardGps: 108.0 },
  { countCode: '30/1-CH-NY', countName: '30/1 Combed Hosiery', description: 'Fine circular knitting', factorTo40s: 0.7500, standardGps: 96.0 },
  { countCode: '36/1-CHY', countName: '36/1 Carded Hosiery', description: 'Standard export hosiery', factorTo40s: 0.9000, standardGps: 80.0 },
  { countCode: '042/1-CH-NY', countName: '42/1 Super Combed', description: 'Ultra-fine compact yarn', factorTo40s: 1.0500, standardGps: 68.0 }
];

// Incentive Rules
const SEED_INCENTIVE_RULES = [
  {
    countPattern: '26/1-CH-CY',
    slabs: [
      { minGps: 98, amountPerSide: 75 },
      { minGps: 102, amountPerSide: 85 },
      { minGps: 106, amountPerSide: 95 },
      { minGps: 110, amountPerSide: 105 },
      { minGps: 114, amountPerSide: 115 }
    ]
  },
  {
    countPattern: '30/1-CH-NY',
    slabs: [
      { minGps: 88, amountPerSide: 75 },
      { minGps: 92, amountPerSide: 85 },
      { minGps: 96, amountPerSide: 95 },
      { minGps: 100, amountPerSide: 105 },
      { minGps: 104, amountPerSide: 115 }
    ]
  },
  {
    countPattern: '34/1-CH-NY',
    slabs: [
      { minGps: 78, amountPerSide: 75 },
      { minGps: 82, amountPerSide: 85 },
      { minGps: 86, amountPerSide: 95 },
      { minGps: 90, amountPerSide: 105 }
    ]
  },
  {
    countPattern: '36/1-CHY',
    slabs: [
      { minGps: 74, amountPerSide: 75 },
      { minGps: 78, amountPerSide: 85 },
      { minGps: 82, amountPerSide: 95 },
      { minGps: 86, amountPerSide: 105 }
    ]
  },
  {
    countPattern: '40s',
    slabs: [
      { minGps: 66, amountPerSide: 75 },
      { minGps: 70, amountPerSide: 85 },
      { minGps: 74, amountPerSide: 95 },
      { minGps: 78, amountPerSide: 105 }
    ]
  },
  {
    countPattern: '042/1-CH-NY',
    slabs: [
      { minGps: 62, amountPerSide: 75 },
      { minGps: 66, amountPerSide: 85 },
      { minGps: 70, amountPerSide: 95 },
      { minGps: 74, amountPerSide: 105 }
    ]
  }
];

export async function runSeed() {
  await connectDB();
  console.log('[Seed] Starting database population...');

  // 1. Machines
  await Machine.deleteMany({});
  const machineDocs = SEED_MACHINES.map((m, idx) => ({
    machineNumber: m,
    sides: ['LH', 'RH'],
    isActive: true,
    displayOrder: idx + 1,
    notes: `KTTM 01 2nd Shed Ringframe ${idx + 1}`
  }));
  await Machine.insertMany(machineDocs);
  console.log(`[Seed] Seeded ${machineDocs.length} machines`);

  // 2. Workers
  await Worker.deleteMany({});
  await Worker.insertMany(SEED_WORKERS);
  console.log(`[Seed] Seeded ${SEED_WORKERS.length} workers (siders)`);

  // 3. Yarn Counts
  await YarnCount.deleteMany({});
  await YarnCount.insertMany(SEED_COUNTS);
  console.log(`[Seed] Seeded ${SEED_COUNTS.length} yarn counts`);

  // 4. Incentive Rules
  await IncentiveRule.deleteMany({});
  await IncentiveRule.insertMany(SEED_INCENTIVE_RULES);
  console.log(`[Seed] Seeded ${SEED_INCENTIVE_RULES.length} incentive rules`);

  // 5. Users
  await User.deleteMany({});
  const users = [
    { username: 'admin', password: 'adminpassword', name: 'Mill Manager (Admin)', role: 'admin', shift: 'ALL', pin: '9999' },
    { username: 'sup_shift1', password: 'supervisorpass', name: 'R. Murugan (Shift 1)', role: 'supervisor', shift: 'I', pin: '1001' },
    { username: 'sup_shift2', password: 'supervisorpass', name: 'S. Loganathan (Shift 2)', role: 'supervisor', shift: 'II', pin: '1002' },
    { username: 'sup_shift3', password: 'supervisorpass', name: 'K. Senthil (Shift 3)', role: 'supervisor', shift: 'III', pin: '1003' },
    { username: 'tv_display', password: 'kioskdisplaypassword', name: 'Shop Floor TV Display', role: 'tv_display', shift: 'ALL', pin: '0000' }
  ];
  for (const u of users) {
    const userDoc = new User(u);
    await userDoc.save();
  }
  console.log(`[Seed] Seeded ${users.length} users`);

  // 6. Mill Calendar
  await MillCalendar.deleteMany({});
  await MillCalendar.insertMany([
    { date: '2026-10-02', isHoliday: true, reason: 'Gandhi Jayanti / Scheduled Shed Maintenance' },
    { date: '2026-10-20', isHoliday: true, reason: 'Ayudha Pooja / Deepavali Special Cleaning' }
  ]);
  console.log('[Seed] Seeded Mill Calendar holidays');

  // 7. Seed 12 Days of Shift Allocations, Production Logs, and EM Logs (Oct 1 to Oct 12, 2026)
  await ShiftAllocation.deleteMany({});
  await DailyProductionLog.deleteMany({});
  await MachineEMLog.deleteMany({});

  const shifts = ['I', 'II', 'III'];
  const dates = [];
  for (let d = 1; d <= 10; d++) {
    dates.push(`2026-10-${String(d).padStart(2, '0')}`);
  }

  // Assign machine counts consistently
  const machineCountMap = {
    'SP025': '26/1-CH-CY',
    'SP026': '26/1-CH-CY',
    'SP027': '26/1-CH-CY',
    'SP029': '30/1-CH-NY',
    'SP030': '30/1-CH-NY',
    'SP031': '30/1-CH-NY',
    'SP032': '34/1-CH-NY',
    'SP033': '34/1-CH-NY',
    'SP034': '36/1-CHY',
    'SP035': '36/1-CHY',
    'SP036': '40s',
    'SP037': '40s',
    'SP038': '042/1-CH-NY',
    'SP056': '042/1-CH-NY'
  };

  const stdGpsMap = {
    '26/1-CH-CY': 108.0,
    '30/1-CH-NY': 96.0,
    '34/1-CH-NY': 85.0,
    '36/1-CHY': 80.0,
    '40s': 72.0,
    '042/1-CH-NY': 68.0
  };

  for (const date of dates) {
    for (const shift of shifts) {
      const isShiftToday = date === '2026-10-10' && shift === 'I';
      const allocations = [];
      const prodLogs = [];
      const emLogs = [];

      // Select 14 workers for this shift (some handling 2 sides, some 1 side, one handling 3 sides)
      // Rotated systematically through workers so all workers have duties across the month
      const dayNum = parseInt(date.split('-')[2], 10);
      const shiftNum = shift === 'I' ? 0 : shift === 'II' ? 1 : 2;
      const workerOffset = ((dayNum * 3) + shiftNum) % 40;

      // Gaiter
      const gaiterToken = SEED_WORKERS[(workerOffset + 25) % SEED_WORKERS.length].tokenNumber;

      // 14 machines * 2 sides = 28 sides
      // Worker 0 takes SP025 LH, RH (2 sides = 100%)
      // Worker 1 takes SP026 LH, RH (2 sides = 100%)
      // Worker 2 takes SP027 LH, RH (2 sides = 100%)
      // ...
      let siderIdx = 0;
      for (let mIdx = 0; mIdx < SEED_MACHINES.length; mIdx++) {
        const m = SEED_MACHINES[mIdx];
        const countCode = machineCountMap[m];
        const baseGps = stdGpsMap[countCode];

        // Variation in GPS
        // Mechanical outlier test: SP038 on 042/1-CH-NY runs 6 GPS lower than SP056
        let actualGps;
        if (m === 'SP038') {
          actualGps = Number((baseGps - 5.5 + ((dayNum % 3) * 0.4)).toFixed(1)); // outlier!
        } else {
          const varGps = ((dayNum * 2 + mIdx + shiftNum) % 7) - 2; // -2 to +4
          actualGps = Number((baseGps + varGps).toFixed(1));
        }

        const hanks = Number((actualGps * 0.42).toFixed(2));
        const productionKg = Number((actualGps * 1.14).toFixed(1));
        const targetKg = Number((baseGps * 1.14).toFixed(1));
        const runHours = m === 'SP031' && dayNum === 9 ? 6.5 : 8.0;
        const stoppedHours = 8.0 - runHours;
        const efficiencyPct = Number(((actualGps / baseGps) * 94.0).toFixed(1));
        const utilizationPct = Number(((runHours / 8.0) * 100).toFixed(1));

        prodLogs.push({
          date,
          shift,
          machineNumber: m,
          countCode,
          hanks,
          productionKg,
          targetKg,
          runHours,
          stoppedHours,
          actualGps,
          utilizationPct,
          efficiencyPct
        });

        // EM Log
        // Outlier on machine SP027 (EM > 4.0) to showcase Quality Alert
        let emValue;
        if (m === 'SP027' && dayNum >= 8) {
          emValue = Number((4.35 + ((dayNum % 3) * 0.15)).toFixed(2)); // Quality alert outlier!
        } else {
          emValue = Number((1.85 + (((mIdx + dayNum) % 5) * 0.35)).toFixed(2));
        }

        const breakCount = Math.round(emValue * 12);
        const pneumafilWastePct = Number((emValue * 0.45).toFixed(2));

        emLogs.push({
          date,
          shift,
          machineNumber: m,
          breakCount,
          pneumafilWastePct,
          emValue
        });

        // Allocation of sides
        // If today Shift 1 and machine SP056 RH, leave unassigned to show live amber unassigned warning!
        const isUnassignedTest = isShiftToday && m === 'SP056';

        // Pair worker to sides
        const workerA = SEED_WORKERS[(workerOffset + siderIdx) % SEED_WORKERS.length].tokenNumber;
        allocations.push({
          machineNumber: m,
          side: 'LH',
          workerToken: workerA
        });

        allocations.push({
          machineNumber: m,
          side: 'RH',
          workerToken: isUnassignedTest ? null : workerA
        });

        siderIdx++;
      }

      await ShiftAllocation.create({
        date,
        shift,
        gaiterToken,
        allocations,
        isLocked: !isShiftToday,
        supervisorId: shift === 'I' ? 'sup_shift1' : shift === 'II' ? 'sup_shift2' : 'sup_shift3'
      });

      await DailyProductionLog.insertMany(prodLogs);
      await MachineEMLog.insertMany(emLogs);
    }
  }

  console.log(`[Seed] Seeded ${dates.length * 3} shifts with full production and EM logs`);
  console.log('[Seed] Database initialization complete!');
}

// Execute if run directly
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('[Seed Error]', err);
    process.exit(1);
  });
}
