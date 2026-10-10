# SCM Textile Spinners · KTTM Unit 01 (Ringframe 2nd Shed)
### Industrial Execution, Machine Telemetry & Sider Payroll Incentive Platform

A full-stack industrial textile manufacturing execution, real-time machine telemetry, and sider payroll incentive platform designed for **SCM Textile Spinners / KTTM Unit 01 (Ringframe 2nd Shed)**.

---

## 🏭 System Highlights

- **14 Ringframe Monitoring (`SP025`–`SP056`):** Dedicated tracking of ring spinning frames, run hours, stop codes, and speed telemetry.
- **71 Sider Operator Allocation Desk:** Interactive LH/RH side allocation matrix with real-time workload calculations (50%, 100%, 150%, 200%) and collision guards.
- **Progressive GPS Incentive Engine:** Automatic calculation of Grams Per Spindle (GPS) incentives based on yarn count slab achievements (₹75–₹115 per side).
- **Dual-Engine Excel Ingestion:** Direct support for official multi-shift SCM Framewise Production Statements (`.xlsx`) and machine End-Mending (EM) quality sheets.
- **Shop-Floor TV Signage Kiosk:** Fullscreen presentation carousel with 4 automated cross-fading slides for live mill signage.
- **Payroll & Dispute Resolution:** 31-day master matrix, monthly abstract with signature sign-off, EM quality audit, and individual worker passbooks.

---

## 🛠️ Technology Stack

- **Frontend:** React 18+ (Vite), Tailwind CSS (Light Theme), Lucide React, Framer Motion, TanStack Table, Recharts, SheetJS (`xlsx`)
- **Backend:** Node.js, Express, MongoDB with Mongoose ORM
- **Authentication:** JWT with Role-Based Access Control (`admin`, `supervisor`, `tv_display`) + URL token kiosk bypass

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally on port 27017

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Hariragavan/Spinning-Production.git
   cd Spinning-Production
   ```

2. **Install dependencies:**
   ```bash
   # Server dependencies
   cd server
   npm install

   # Client dependencies
   cd ../client
   npm install
   ```

3. **Configure Environment:**
   ```bash
   # In server directory, copy .env.example
   cp .env.example .env
   ```

4. **Initialize Masters:**
   ```bash
   cd server
   npm run seed
   ```

5. **Run Locally:**
   ```bash
   # Terminal 1: Backend API (Port 5000)
   cd server
   npm run dev

   # Terminal 2: Frontend App (Port 5173)
   cd client
   npm run dev
   ```

6. Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## 🖥️ User Roles & Credentials

| Role | Username / Shift | PIN | Default Access |
| :--- | :--- | :--- | :--- |
| **Mill Admin** | `admin` | `9999` | Full permissions, master registries, payroll approvals, data gateway |
| **Supervisor Shift I** | `sup_shift1` (Morning) | `1001` | Shift operations, side allocation, Excel upload, passbook dispute resolver |
| **Supervisor Shift II** | `sup_shift2` (Afternoon) | `1002` | Shift operations, side allocation, Excel upload |
| **Supervisor Shift III** | `sup_shift3` (Night) | `1003` | Shift operations, side allocation, Excel upload |
| **TV Display Kiosk** | `tv_display` | Bypass | `http://localhost:5173/?token=shed2_live_display` (Read-only fullscreen) |

---

## 📊 Core Application Views

1. **Live Dashboard & Digital Signage (`/dashboard`):** Overall efficiency %, spindle utilization, 40s converted GPS, active shift pool, and October Top 6 Siders Hall of Fame.
2. **Shop TV Signage (`/tv-mode`):** Fullscreen rotating signage carousel (KPI Overview, 14-Machine Grid, Count GPS Trends, Hall of Fame).
3. **Shift Operations & Allocation Desk (`/operations`):** LH/RH machine cards, sider assignment dropdowns, workload badges, conflict alerts, and live payout preview drawer.
4. **Machine & Production Analytics (`/analytics`):** Shift vs MTD variance tables, Recharts multi-line GPS run chart, and mechanical outlier detection.
5. **Payroll & Worker Passbooks (`/payroll`):** Accounts sign-off abstract, 31-day master matrix, EM quality breakdown, printable passbooks, and SheetJS Excel export.
6. **Data Gateway & Masters (`/admin`):** SCM Framewise Excel dropzone with live preview, worker/machine/count registries, and JSON backups.

---

## 📄 License

Proprietary · SCM Textile Spinners / KTTM Unit 01. All rights reserved.
