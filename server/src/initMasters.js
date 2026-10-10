import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import dns from 'dns';
// Fallback to Google / Cloudflare DNS if local ISP blocks SRV lookup
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore if not allowed
}

import { connectDB } from './db.js';
import { Machine } from './models/Machine.js';
import { Worker } from './models/Worker.js';
import { YarnCount } from './models/YarnCount.js';
import { IncentiveRule } from './models/IncentiveRule.js';
import { User } from './models/User.js';
import { MillCalendar } from './models/MillCalendar.js';
import { DailyProductionLog } from './models/DailyProductionLog.js';
import { MachineEMLog } from './models/MachineEMLog.js';
import { ShiftAllocation } from './models/ShiftAllocation.js';

dotenv.config();

// 14 Ringframe Machines for KTTM Unit 01 (Shed 2)
const SEED_MACHINES = [
  'SP025', 'SP026', 'SP027', 'SP029', 'SP030', 'SP031',
  'SP032', 'SP033', 'SP034', 'SP035', 'SP036', 'SP037',
  'SP038', 'SP056'
];

// 71 Authentic Sider names
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

// 71 Sider Master records
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

// 17 Yarn Counts
const SEED_COUNTS = [
  { countCode: '040/1-CH-NY', countName: '40/1 Carded Hosiery Normal', factorTo40s: 1.00, standardGps: 76.5 },
  { countCode: '042/1-CH-NY', countName: '42/1 Carded Hosiery Normal', factorTo40s: 1.05, standardGps: 72.8 },
  { countCode: '040/1-CW-NY', countName: '40/1 Carded Weaving Normal', factorTo40s: 1.00, standardGps: 74.2 },
  { countCode: '034/1-CH-NY', countName: '34/1 Carded Hosiery Normal', factorTo40s: 0.85, standardGps: 87.0 },
  { countCode: '030/1-CW-NY', countName: '30/1 Carded Weaving Normal', factorTo40s: 0.75, standardGps: 98.4 },
  { countCode: '032/1-CW-NY', countName: '32/1 Carded Weaving Normal', factorTo40s: 0.80, standardGps: 91.2 },
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

export async function initDatabaseMasters() {
  console.log('[Atlas DB Init] Connecting to MongoDB Atlas...');
  const conn = await connectDB();
  console.log(`[Atlas DB Init] Connected to: ${conn.connection.name} on ${conn.connection.host}`);

  // 1. Initialize Machines
  console.log('[Atlas DB Init] Seeding 14 Ringframe machines...');
  for (const m of SEED_MACHINES) {
    await Machine.findOneAndUpdate(
      { machineNumber: m },
      {
        machineNumber: m,
        model: 'KTTM Ring Spinning',
        unitNumber: 'KTTM Unit 01',
        shedNumber: 'Ringframe 2nd Shed',
        spindlesPerSide: 600,
        totalSpindles: 1200,
        status: 'RUNNING'
      },
      { upsert: true, new: true }
    );
  }

  // 2. Initialize Workers
  console.log('[Atlas DB Init] Seeding 71 Workers...');
  for (const w of SEED_WORKERS) {
    await Worker.findOneAndUpdate(
      { tokenNumber: w.tokenNumber },
      w,
      { upsert: true, new: true }
    );
  }

  // 3. Initialize Yarn Counts & Incentive Slabs
  console.log('[Atlas DB Init] Seeding 17 Yarn Counts & Incentive Slabs...');
  for (const c of SEED_COUNTS) {
    await YarnCount.findOneAndUpdate(
      { countCode: c.countCode },
      { ...c, isActive: true },
      { upsert: true, new: true }
    );

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
      { upsert: true, new: true }
    );
  }

  // 4. Initialize Users
  console.log('[Atlas DB Init] Seeding Authentication Users...');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const shiftPasswordHash = await bcrypt.hash('shift123', 10);

  const users = [
    { username: 'admin', passwordHash, fullName: 'Mill General Manager', role: 'ADMIN', pinCode: '9999' },
    { username: 'sup_shift1', passwordHash: shiftPasswordHash, fullName: 'Supervisor Shift I (Day)', role: 'SHIFT_SUPERVISOR', pinCode: '1001' },
    { username: 'sup_shift2', passwordHash: shiftPasswordHash, fullName: 'Supervisor Shift II (Evening)', role: 'SHIFT_SUPERVISOR', pinCode: '1002' },
    { username: 'sup_shift3', passwordHash: shiftPasswordHash, fullName: 'Supervisor Shift III (Night)', role: 'SHIFT_SUPERVISOR', pinCode: '1003' },
    { username: 'tv_display', passwordHash, fullName: 'Shop Floor Signage Kiosk', role: 'TV_DISPLAY', pinCode: '0000' }
  ];

  for (const u of users) {
    await User.findOneAndUpdate(
      { username: u.username },
      u,
      { upsert: true, new: true }
    );
  }

  // 5. Initialize Mill Calendar
  console.log('[Atlas DB Init] Seeding Mill Calendar...');
  await MillCalendar.findOneAndUpdate(
    { month: '2026-10' },
    {
      month: '2026-10',
      totalDays: 31,
      totalWorkingDays: 27,
      holidays: [
        { date: '2026-10-02', reason: 'Gandhi Jayanti' },
        { date: '2026-10-18', reason: 'Ayudha Puja' },
        { date: '2026-10-19', reason: 'Vijaya Dasami' },
        { date: '2026-10-29', reason: 'Deepavali' }
      ]
    },
    { upsert: true, new: true }
  );

  // 6. Ensure clean slate (0 telemetry logs)
  await DailyProductionLog.deleteMany({});
  await MachineEMLog.deleteMany({});
  await ShiftAllocation.deleteMany({});

  console.log('========================================================');
  console.log('✅ MongoDB Atlas Tables (Collections) Initialized Successfully!');
  console.log('   - 14 Ringframe Machines');
  console.log('   - 71 Workers & Token Registry');
  console.log('   - 17 Yarn Count Benchmark Masters');
  console.log('   - 17 GPS Incentive Slab Rules');
  console.log('   - 5 Authentication Accounts (Admin PIN 9999, Shifts 1001-1003)');
  console.log('   - 0 Production/EM logs (Clean slate for Excel uploads)');
  console.log('========================================================');
}

if (process.argv[1]?.endsWith('initMasters.js')) {
  initDatabaseMasters().then(() => process.exit(0)).catch(err => {
    console.error('[Init Error]', err);
    process.exit(1);
  });
}
