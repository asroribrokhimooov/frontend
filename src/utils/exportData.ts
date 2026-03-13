import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * HTML elementdan yoki matndan PDF yaratadi
 */
export function exportToPDF(
  source: string | HTMLElement,
  filename: string = 'export.pdf',
  title?: string
): void {
  const doc = new jsPDF();
  const element =
    typeof source === 'string' ? document.getElementById(source) : source;
  if (element) {
    const text = element.innerText?.substring(0, 5000) ?? '';
    let y = 10;
    if (title) {
      doc.setFontSize(14);
      doc.text(title, 10, y);
      y += 10;
    }
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, 190);
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 6;
    });
    doc.save(filename);
  }
}

/**
 * Massiv ma'lumotlarini jadval ko'rinishida PDF ga eksport qiladi
 */
export function exportTableToPDF<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string = 'export.pdf',
  title?: string
): void {
  const doc = new jsPDF();
  let y = 10;
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 10, y);
    y += 10;
  }
  doc.setFontSize(9);
  const colWidth = 190 / columns.length;
  columns.forEach((col, i) => {
    doc.text(col.header, 10 + i * colWidth, y);
  });
  y += 6;
  data.slice(0, 50).forEach((row) => {
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
    columns.forEach((col, i) => {
      const val = row[col.key];
      doc.text(String(val ?? ''), 10 + i * colWidth, y);
    });
    y += 6;
  });
  doc.save(filename);
}

/**
 * Massivni Excel faylga eksport qiladi
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Data'
): void {
  if (!data?.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
