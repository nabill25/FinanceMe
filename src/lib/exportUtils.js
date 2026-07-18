import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from './utils';

/**
 * Export transactions to PDF
 */
export const exportTransactionsToPDF = (transactions, monthLabel) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Daftar Transaksi - ${monthLabel}`, 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);

  const tableColumn = ["Tanggal", "Deskripsi", "Kategori", "Akun", "Tipe", "Nominal"];
  const tableRows = [];

  transactions.forEach(t => {
    const transactionData = [
      new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      t.description || '-',
      t.categories?.name || 'Tanpa Kategori',
      t.accounts?.name || 'Unknown',
      t.type === 'expense' ? 'Pengeluaran' : 'Pemasukan',
      formatCurrency(t.amount)
    ];
    tableRows.push(transactionData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      5: { halign: 'right' }
    }
  });

  doc.save(`Transaksi_FinanceMe_${monthLabel.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Export transactions to Excel (XLSX)
 */
export const exportTransactionsToExcel = (transactions, monthLabel) => {
  const data = transactions.map(t => ({
    Tanggal: new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    Deskripsi: t.description || '-',
    Kategori: t.categories?.name || 'Tanpa Kategori',
    Akun: t.accounts?.name || 'Unknown',
    Tipe: t.type === 'expense' ? 'Pengeluaran' : 'Pemasukan',
    'Nominal (Rp)': t.amount
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Set column widths
  const wscols = [
    { wch: 12 }, // Tanggal
    { wch: 30 }, // Deskripsi
    { wch: 15 }, // Kategori
    { wch: 15 }, // Akun
    { wch: 12 }, // Tipe
    { wch: 15 }  // Nominal
  ];
  worksheet['!cols'] = wscols;

  XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
  XLSX.writeFile(workbook, `Transaksi_FinanceMe_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
};

/**
 * Export Report Summary to PDF
 */
export const exportReportToPDF = (reportData, categoryData, monthLabel) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(31, 41, 55);
  doc.text(`Laporan Keuangan`, 14, 25);
  
  doc.setFontSize(14);
  doc.setTextColor(107, 114, 128);
  doc.text(monthLabel, 14, 35);

  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 42);

  // Summary Cards (Text representation)
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 50, 182, 35, 3, 3, 'FD');

  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128);
  doc.text("Pemasukan", 25, 62);
  doc.text("Pengeluaran", 85, 62);
  doc.text("Net (Surplus/Defisit)", 145, 62);

  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // Green
  doc.text(formatCurrency(reportData.income), 25, 72);
  
  doc.setTextColor(239, 68, 68); // Red
  doc.text(formatCurrency(reportData.expense), 85, 72);
  
  doc.setTextColor(reportData.net >= 0 ? 99 : 245, reportData.net >= 0 ? 102 : 158, reportData.net >= 0 ? 241 : 11);
  doc.text(formatCurrency(reportData.net), 145, 72);

  // Categories Breakdown
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text("Rincian Pengeluaran", 14, 105);

  if (categoryData.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text("Tidak ada data pengeluaran bulan ini.", 14, 115);
  } else {
    const tableColumn = ["Kategori", "Total Pengeluaran", "Persentase"];
    const tableRows = [];
    const totalExpense = reportData.expense;

    categoryData.forEach(c => {
      const percentage = totalExpense > 0 ? ((c.total / totalExpense) * 100).toFixed(1) + '%' : '0%';
      tableRows.push([
        c.name,
        formatCurrency(c.total),
        percentage
      ]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 115,
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 4 },
      headStyles: { fillColor: [243, 244, 246], textColor: 31 }, // Light gray head
      alternateRowStyles: { fillColor: [252, 253, 254] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    });
  }

  doc.save(`Laporan_FinanceMe_${monthLabel.replace(/\s+/g, '_')}.pdf`);
};
