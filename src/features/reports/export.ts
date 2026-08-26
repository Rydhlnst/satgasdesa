import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import type { MonthlyReport } from "./service";

function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function pdfList(document: PDFKit.PDFDocument, values: string[]): void {
  for (const value of values) document.text(`• ${value}`);
}

export async function exportMonthlyReportExcel(report: MonthlyReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SATGAS DESA SEJOLI";
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 34 }, { width: 22 }];
  summary.addRow(["Monthly Report", report.periodKey]);
  summary.addRow([]);
  for (const [label, value] of [["Inspections", report.operational.inspections], ["Excavator movements", report.operational.excavatorMovements], ["Daily information", report.operational.totalInformation], ["Complaints", report.operational.complaints], ["Incidents", report.operational.incidents], ["Prospective managers", report.operational.prospectiveManagers], ["Notices", report.operational.notices], ["Open information", report.operational.openInformation], ["Opening balance", rupiah(report.financial.openingBalance)], ["Income", rupiah(report.financial.income)], ["Expenses", rupiah(report.financial.expenses)], ["Payments received", rupiah(report.financial.paymentsReceived)], ["Dues obligation", rupiah(report.financial.duesObligation)], ["Receivables", rupiah(report.financial.receivables)], ["Closing balance", rupiah(report.financial.closingBalance)], ["Budget allocation", rupiah(report.budget.allocation)], ["Approved realization", rupiah(report.budget.realization)], ["Remaining allocation", rupiah(report.budget.remainingAllocation)], ["Budget absorption", `${report.budget.absorptionPercentage}%`], ["Source reconciliation", report.financial.reconciliation.reconciled ? "Reconciled" : "Mismatch"]]) summary.addRow([label, value]);
  summary.getRow(1).font = { bold: true, size: 14 };
  const blocks = workbook.addWorksheet("Block Summary");
  blocks.columns = [{ header: "Block code", key: "blockCode", width: 18 }, { header: "Block name", key: "blockName", width: 30 }, { header: "Information", key: "total", width: 14 }, { header: "Open", key: "open", width: 12 }];
  blocks.addRows(report.operational.byBlock);
  blocks.getRow(1).font = { bold: true };
  const categories = workbook.addWorksheet("Information Summary");
  categories.columns = [{ header: "Category", key: "category", width: 28 }, { header: "Total", key: "total", width: 14 }];
  categories.addRows(Object.entries(report.operational.byCategory).map(([category, total]) => ({ category, total })));
  categories.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function exportMonthlyReportPdf(report: MonthlyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.fontSize(18).text("SATGAS DESA SEJOLI — Monthly Report");
    document.moveDown(0.4).fontSize(11).text(`Period: ${report.periodKey}`);
    document.moveDown().fontSize(13).text("Operational");
    document.fontSize(10); pdfList(document, [`Inspections: ${report.operational.inspections}`, `Excavator movements: ${report.operational.excavatorMovements}`, `Daily information: ${report.operational.totalInformation}`, `Open information: ${report.operational.openInformation}`, `Complaints: ${report.operational.complaints}`, `Incidents: ${report.operational.incidents}`, `Prospective managers: ${report.operational.prospectiveManagers}`, `Notices: ${report.operational.notices}`]);
    document.moveDown().fontSize(13).text("Financial");
    document.fontSize(10); pdfList(document, [`Opening balance: ${rupiah(report.financial.openingBalance)}`, `Income: ${rupiah(report.financial.income)}`, `Expenses: ${rupiah(report.financial.expenses)}`, `Payments received: ${rupiah(report.financial.paymentsReceived)}`, `Dues obligation: ${rupiah(report.financial.duesObligation)}`, `Receivables: ${rupiah(report.financial.receivables)}`, `Closing balance: ${rupiah(report.financial.closingBalance)}`, `Source reconciliation: ${report.financial.reconciliation.reconciled ? "Reconciled" : "Mismatch"}`]);
    document.moveDown().fontSize(13).text("Budget");
    document.fontSize(10); pdfList(document, [`Allocation: ${rupiah(report.budget.allocation)}`, `Approved realization: ${rupiah(report.budget.realization)}`, `Remaining allocation: ${rupiah(report.budget.remainingAllocation)}`, `Absorption: ${report.budget.absorptionPercentage}%`, `Over-allocated realizations: ${report.budget.overAllocatedRealizations}`]);
    if (report.operational.byBlock.length) {
      document.moveDown().fontSize(13).text("Block Summary");
      document.fontSize(10);
      for (const item of report.operational.byBlock) document.text(`${item.blockCode} — ${item.blockName}: ${item.total} information, ${item.open} open`);
    }
    document.end();
  });
}
