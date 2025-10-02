import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

export interface ExportOptions {
  type: 'pdf' | 'csv' | 'excel' | 'image' | 'text';
  fileName: string;
  fromDate: string;
  toDate: string;
  timeFrom: string;
  timeTo: string;
  meterName: string;
  columns: string[];
  data: any[];
  formatDateTime: (dateTimeString: string) => string;
  getColumnValue: (row: any, col: string) => string;
}

function formatDateWithFullMonth(dateStr: string) {
  if (!dateStr) return '-';
  const [day, month, year] = dateStr.split('/');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${day} ${monthNames[monthIndex]} ${year}`;
}

export async function exportTableData(options: ExportOptions) {
  const {
    type,
    fileName,
    fromDate,
    toDate,
    timeFrom,
    timeTo,
    meterName,
    columns,
    data,
    formatDateTime,
    getColumnValue,
  } = options;

  if (type === 'pdf') {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('WebMeter - Table Data Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${formatDateWithFullMonth(fromDate)} ${timeFrom} - ${formatDateWithFullMonth(toDate)} ${timeTo}`, 14, 30);
    doc.text(`Meter: ${meterName}`, 14, 40);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 14, 45);
    const headers = ['Time', ...columns];
    const tableData = data.map(row => [
      formatDateTime(row.reading_timestamp || row.time),
      ...columns.map(col => getColumnValue(row, col))
    ]);
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 55,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 25 } },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 55, right: 14, bottom: 20, left: 14 },
      tableWidth: 'auto',
      theme: 'grid',
    });
    doc.save(`${fileName}.pdf`);
  } else if (type === 'excel') {
    // Excel export using XLSX library
    try {
      const XLSX = (await import('xlsx')).default;
      
      // Prepare data for Excel
      const excelData = [];
      
      // Add headers with metadata
      excelData.push([`Meter: ${meterName}`]);
      excelData.push([`Date: ${formatDateWithFullMonth(fromDate)} ${timeFrom} - ${formatDateWithFullMonth(toDate)} ${timeTo}`]);
      excelData.push([`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`]);
      excelData.push([]); // Empty row
      
      // Add column headers
      const headers = ['Time', ...columns];
      excelData.push(headers);
      
      // Add data rows
      data.forEach(row => {
        const rowData = [
          formatDateTime(row.reading_timestamp || row.time),
          ...columns.map(col => getColumnValue(row, col))
        ];
        excelData.push(rowData);
      });
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      
      // Auto-fit columns
      const colWidths = headers.map((header, index) => {
        let maxLength = header.length;
        excelData.slice(5).forEach(row => { // Skip metadata rows
          const cellValue = row[index];
          if (cellValue) {
            const cellLength = cellValue.toString().length;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          }
        });
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export Data');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });
      
      // Create blob and download
      const excelBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(excelBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('❌ Error creating Excel file:', error);
      // Fallback to CSV
      console.log('🔄 Falling back to CSV export...');
      const csvHeaders = ['Time', ...columns];
      let csv = `Meter: ${meterName}\nDate: ${formatDateWithFullMonth(fromDate)} ${timeFrom} - ${formatDateWithFullMonth(toDate)} ${timeTo}\n` + csvHeaders.map(h => '"' + h.replace(/"/g, '""') + '"').join(',') + '\n';
      data.forEach(row => {
        const rowData = [formatDateTime(row.reading_timestamp || row.time), ...columns.map(col => getColumnValue(row, col))];
        csv += rowData.map(val => '"' + (val ?? '').toString().replace(/"/g, '""') + '"').join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  } else if (type === 'csv') {
    function headersToCSV(headers: string[]) {
      return headers.map(h => '"' + h.replace(/"/g, '""') + '"').join(',');
    }
    // Build header info lines
    const dateRangeStr = `Date: ${formatDateWithFullMonth(fromDate)} ${timeFrom} - ${formatDateWithFullMonth(toDate)} ${timeTo}`;
    const meterLine = `Meter: ${meterName}`;
    let csv = meterLine + '\n' + dateRangeStr + '\n' + headersToCSV(['Time', ...columns]) + '\n';
    data.forEach(row => {
      const rowData = [formatDateTime(row.reading_timestamp || row.time), ...columns.map(col => getColumnValue(row, col))];
      csv += rowData.map(val => '"' + (val ?? '').toString().replace(/"/g, '""') + '"').join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (type === 'image') {
    // Build a full virtual table from ALL rows to avoid pagination clipping
    const wrapper = document.createElement('div');
    wrapper.style.background = '#ffffff';
    wrapper.style.padding = '16px';
    wrapper.style.display = 'inline-block';
    wrapper.style.maxWidth = 'unset';

    const header = document.createElement('div');
    header.style.marginBottom = '8px';
    header.style.fontFamily = 'Arial, sans-serif';
    header.style.color = '#111827';

    const titleEl = document.createElement('div');
    titleEl.textContent = `Meter: ${meterName}`;
    titleEl.style.fontSize = '14px';
    titleEl.style.fontWeight = '600';

    const dateEl = document.createElement('div');
    dateEl.textContent = `Date: ${formatDateWithFullMonth(fromDate)} ${timeFrom} - ${formatDateWithFullMonth(toDate)} ${timeTo}`;
    dateEl.style.fontSize = '12px';
    dateEl.style.marginTop = '2px';

    header.appendChild(titleEl);
    header.appendChild(dateEl);

    const tableEl = document.createElement('table');
    tableEl.style.borderCollapse = 'collapse';
    tableEl.style.fontFamily = 'Arial, sans-serif';
    tableEl.style.fontSize = '10px';
    tableEl.style.background = '#ffffff';
    tableEl.style.color = '#111827';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const timeTh = document.createElement('th');
    timeTh.textContent = 'Time';
    timeTh.style.background = '#06b6d4';
    timeTh.style.color = '#ffffff';
    timeTh.style.fontWeight = '600';
    timeTh.style.padding = '4px';
    timeTh.style.border = '1px solid #ffffff';
    headRow.appendChild(timeTh);
    columns.forEach((c) => {
      const th = document.createElement('th');
      th.textContent = c;
      th.style.background = '#06b6d4';
      th.style.color = '#ffffff';
      th.style.fontWeight = '600';
      th.style.padding = '4px';
      th.style.border = '1px solid #ffffff';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    data.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.style.background = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
      const timeTd = document.createElement('td');
      timeTd.textContent = formatDateTime(row.reading_timestamp || row.time);
      timeTd.style.padding = '4px';
      timeTd.style.border = '1px solid #e5e7eb';
      tr.appendChild(timeTd);
      columns.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = getColumnValue(row, c);
        td.style.textAlign = 'center';
        td.style.padding = '4px';
        td.style.border = '1px solid #e5e7eb';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    tableEl.appendChild(thead);
    tableEl.appendChild(tbody);

    wrapper.appendChild(header);
    wrapper.appendChild(tableEl);
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(wrapper as HTMLElement, { scale: 2 });
    document.body.removeChild(wrapper);
    const imgData = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = imgData;
    a.download = `${fileName}.png`;
    a.click();
  } else if (type === 'text') {
    // Example: Export as .txt file (simple table)
    let txt = 'Time\t' + columns.join('\t') + '\n';
    data.forEach(row => {
      const rowData = [formatDateTime(row.reading_timestamp || row.time), ...columns.map(col => getColumnValue(row, col))];
      txt += rowData.join('\t') + '\n';
    });
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
