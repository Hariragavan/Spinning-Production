import express from 'express';
import * as XLSX from 'xlsx';
import { getMonthlyPayrollData, getWorkerPassbook } from '../services/payrollEngine.js';

const router = express.Router();

// Monthly Payroll aggregation (Abstract, 31-day matrix, EM audit, Top 6)
router.get('/monthly', async (req, res) => {
  try {
    const month = req.query.month || '2026-10';
    const payrollData = await getMonthlyPayrollData(month);
    res.json(payrollData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Single Worker Passbook & Dispute Resolver
router.get('/passbook/:tokenNumber', async (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const { month } = req.query;
    const passbook = await getWorkerPassbook(tokenNumber, month || null);
    if (!passbook) {
      return res.status(404).json({ message: `Worker with token ${tokenNumber} not found` });
    }
    res.json(passbook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Excel Export: Monthly Abstract & Master 31-Day Matrix
router.get('/export-excel', async (req, res) => {
  try {
    const month = req.query.month || '2026-10';
    const data = await getMonthlyPayrollData(month);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Monthly Abstract (Accounts Sign-off)
    const abstractRows = data.monthlyAbstract.map(item => ({
      'S.No': item.sno,
      'Token No': item.tokenNumber,
      'Worker Name': item.name,
      'Department': item.department,
      'Total Shifts Worked': item.totalDuties,
      'Gross Incentive (INR)': item.grossIncentive,
      'Supervisor Verified': '',
      'Worker Signature': ''
    }));
    const wsAbstract = XLSX.utils.json_to_sheet(abstractRows);
    XLSX.utils.book_append_sheet(wb, wsAbstract, 'Monthly Abstract');

    // Sheet 2: 31-Day Master Matrix
    const matrixRows = data.matrix31Days.map(item => {
      const row = {
        'Token No': item.tokenNumber,
        'Worker Name': item.name,
        'Total Duties': item.totalDuties
      };
      for (let day = 1; day <= 31; day++) {
        row[`D${day}`] = item.days[day] || 0;
      }
      row['Avg EM'] = item.avgEm;
      row['Avg GPS'] = item.avgGps;
      row['Total Incentive (INR)'] = item.totalIncentive;
      return row;
    });
    const wsMatrix = XLSX.utils.json_to_sheet(matrixRows);
    XLSX.utils.book_append_sheet(wb, wsMatrix, '31-Day Matrix');

    // Sheet 3: EM Quality Audit
    const emRows = data.emQualityAudit.map(item => ({
      'Token No': item.tokenNumber,
      'Worker Name': item.name,
      'Total Duties': item.totalDuties,
      'Average EM Score': item.avgEm,
      'Highest EM Recorded': item.highestEm,
      'Outlier Status (>4.0)': item.isOutlier ? 'CRITICAL OUTLIER' : 'NORMAL'
    }));
    const wsEm = XLSX.utils.json_to_sheet(emRows);
    XLSX.utils.book_append_sheet(wb, wsEm, 'EM Quality Audit');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=SCM_Payroll_${month}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
