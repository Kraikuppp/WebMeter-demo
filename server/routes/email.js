const express = require('express');
const db = require('../config/database');
const router = express.Router();
const nodemailer = require('nodemailer');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');
const { format } = require('date-fns');

// วิธีที่ 1: ใช้ App Password (แนะนำ)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
};

// วิธีที่ 2: ใช้ OAuth2 (ปลอดภัยที่สุด)
const createTransporterOAuth2 = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN
    }
  });
};

// วิธีที่ 3: ใช้ SMTP อื่นแทน Gmail
const createTransporterOutlook = () => {
  return nodemailer.createTransport({
    service: 'hotmail', // หรือ 'outlook'
    auth: {
      user: process.env.EMAIL_USER, // Outlook email
      pass: process.env.EMAIL_PASS  // Outlook password
    }
  });
};

// วิธีที่ 4: ใช้ Custom SMTP
const createTransporterCustom = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD // ต้องใช้ App Password
    }
  });
};

// วิธีที่ 5: ใช้ SendGrid (External Service)
const createTransporterSendGrid = () => {
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
};

// POST /api/email/send-pdf - ส่ง PDF ผ่าน email
router.post('/send-pdf', async (req, res) => {
  try {
    const { 
      to_email, 
      to_name, 
      subject, 
      tableData, 
      columns, 
      meterName, 
      dateRange, 
      timeRange, 
      exportType,
      isOnlineDataFormat,
      reportTitle,
      isDemandGraphFormat,
      customImageData
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!to_email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    if (!process.env.EMAIL_USER) {
      return res.status(500).json({
        success: false,
        error: 'Email configuration is missing. Please check EMAIL_USER in environment variables.'
      });
    }

    console.log('Email configuration check:', {
      hasEmailUser: !!process.env.EMAIL_USER,
      hasAppPassword: !!process.env.EMAIL_APP_PASSWORD,
      hasOAuth: !!(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET),
      emailUser: process.env.EMAIL_USER
    });

    let attachment = null;
    let filename = '';
    let contentType = '';

    if (exportType === 'pdf') {
      // ตรวจสอบว่ามี customImageData หรือไม่ (สำหรับ PDF ที่มีกราฟ)
      if (customImageData) {
        console.log('📧 Using custom PDF data from frontend');
        console.log('📧 Custom PDF data length:', customImageData.length);
        console.log('📧 Custom PDF data preview:', customImageData.substring(0, 100));
        // ใช้ PDF data ที่ส่งมาจาก frontend (เป็น data URI)
        const base64Data = customImageData.replace(/^data:application\/pdf;base64,/, '');
        console.log('📧 Base64 data length after cleanup:', base64Data.length);
        attachment = Buffer.from(base64Data, 'base64');
        console.log('📧 PDF buffer size:', attachment.length, 'bytes');
        
        // กำหนดชื่อไฟล์ตาม reportTitle
        let baseFilename = 'TableData';
        if (reportTitle) {
          if (reportTitle.includes('Energy Graph')) {
            baseFilename = 'EnergyGraph';
          } else if (reportTitle.includes('Demand Graph')) {
            baseFilename = 'DemandGraph';
          } else if (reportTitle.includes('Line Graph')) {
            baseFilename = 'LineGraph';
          } else if (reportTitle.includes('Compare Graph')) {
            baseFilename = 'CompareGraph';
          } else if (reportTitle.includes('TOU-Demand') || reportTitle.includes('TOU Demand')) {
            baseFilename = 'TOU-Demand';
          }
        }
        filename = `${baseFilename}_${format(new Date(), 'ddMMyyyy')}.pdf`;
        contentType = 'application/pdf';
        console.log('📁 Using custom PDF, filename:', filename);
      } else {
        // สร้าง PDF แบบตาราง (วิธีเดิม)
        const doc = new jsPDF('landscape', 'mm', 'a4');

        // Header
        doc.setFontSize(16);
        const title = reportTitle || 'WebMeter Table Data Report';
        doc.text(title, 14, 20);

        doc.setFontSize(10);
        doc.text(`Meter: ${meterName}`, 14, 30);
        doc.text(`Date: ${dateRange}`, 14, 35);
        doc.text(`Time: ${timeRange}`, 14, 40);

      // สร้างตารางข้อมูล
      if (tableData && tableData.length > 0) {
        let tableColumns, tableRows;
        
        if (isOnlineDataFormat) {
          // OnlineData format: Device Name | Meter 1 | Meter 2 | ...
          tableColumns = ['Device Name', ...columns];
          tableRows = tableData.map(row => [
            row.parameterName || 'Unknown Parameter',
            ...columns.map(col => row[col] || '-')
          ]);
        } else {
          // TableData format: Time | Column 1 | Column 2 | ...
          tableColumns = ['Time', ...columns];
          tableRows = tableData.map(row => [
            row.time || row.reading_timestamp,
            ...columns.map(col => row[col] || '-')
          ]);
        }

        // ใช้ autoTable function
        try {
          if (typeof autoTable === 'function') {
            autoTable(doc, {
              head: [tableColumns],
              body: tableRows,
              startY: 50,
              styles: {
                fontSize: 8,
                cellPadding: 2
              },
              headStyles: {
                fillColor: [6, 182, 212],
                textColor: 255
              },
              alternateRowStyles: {
                fillColor: [249, 250, 251]
              }
            });
          } else {
            // Fallback: สร้างตารางแบบง่าย
            doc.setFontSize(8);
            let y = 50;
            tableColumns.forEach((col, i) => {
              doc.text(col, 14 + (i * 30), y);
            });
            y += 10;
            tableRows.forEach(row => {
              row.forEach((cell, i) => {
                doc.text(cell.toString(), 14 + (i * 30), y);
              });
              y += 8;
            });
          }
        } catch (error) {
          console.error('Error creating table:', error);
          doc.setFontSize(10);
          doc.text('Table data available in CSV format', 14, 50);
        }
      }

        attachment = Buffer.from(doc.output('arraybuffer'));
        // กำหนดชื่อไฟล์ตาม reportTitle
        let baseFilename = 'TableData';
        console.log('🔍 PDF Filename Debug:', { reportTitle, hasReportTitle: !!reportTitle });
        if (reportTitle) {
          console.log('🔍 Checking reportTitle:', reportTitle);
          if (reportTitle.includes('Energy Graph')) {
            baseFilename = 'EnergyGraph';
            console.log('✅ Matched Energy Graph');
          } else if (reportTitle.includes('Demand Graph')) {
            baseFilename = 'DemandGraph';
            console.log('✅ Matched Demand Graph');
          } else if (reportTitle.includes('Line Graph')) {
            baseFilename = 'LineGraph';
            console.log('✅ Matched Line Graph');
          } else if (reportTitle.includes('Compare Graph')) {
            baseFilename = 'CompareGraph';
            console.log('✅ Matched Compare Graph');
          } else if (reportTitle.includes('TOU-Demand') || reportTitle.includes('TOU Demand')) {
            baseFilename = 'TOU-Demand';
            console.log('✅ Matched TOU-Demand');
          } else {
            console.log('❌ No match found, using default TableData');
          }
        } else {
          console.log('❌ No reportTitle provided, using default TableData');
        }
        filename = `${baseFilename}_${format(new Date(), 'ddMMyyyy')}.pdf`;
        console.log('📁 Final PDF filename:', filename);
        contentType = 'application/pdf';
      }
      
    } else if (exportType === 'csv') {
      // สร้าง CSV
      let csv = '';
      
      // เพิ่มข้อมูล header
      const csvTitle = reportTitle || 'WebMeter Table Data Report';
      csv += csvTitle + '\n';
      csv += `Meter: ${meterName}\n`;
      csv += `Date: ${dateRange}\n`;
      csv += `Time: ${timeRange}\n`;
      csv += `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n`;
      csv += '\n'; // บรรทัดว่าง
      
      // เพิ่มข้อมูลตาราง
      if (isOnlineDataFormat) {
        // OnlineData format: Device Name | Meter 1 | Meter 2 | ...
        csv += 'Device Name,' + columns.join(',') + '\n';
        tableData.forEach(row => {
          const parameterName = row.parameterName || 'Unknown Parameter';
          const values = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined || value === '') {
              return '"-"';
            }
            return `"${value}"`;
          }).join(',');
          csv += `"${parameterName}",${values}\n`;
        });
      } else {
        // TableData format: Time | Column 1 | Column 2 | ...
        csv += 'Time,' + columns.join(',') + '\n';
        tableData.forEach(row => {
          const time = row.time || row.reading_timestamp || '';
          const values = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined || value === '') {
              return '"0.00"';
            }
            return `"${value}"`;
          }).join(',');
          csv += `"${time}",${values}\n`;
        });
      }
      
      attachment = Buffer.from(csv, 'utf8');
      // กำหนดชื่อไฟล์ตาม reportTitle
      let baseFilename = 'TableData';
      console.log('🔍 CSV Filename Debug:', { reportTitle, hasReportTitle: !!reportTitle });
      if (reportTitle) {
        console.log('🔍 Checking reportTitle:', reportTitle);
        if (reportTitle.includes('Energy Graph')) {
          baseFilename = 'EnergyGraph';
          console.log('✅ Matched Energy Graph');
        } else if (reportTitle.includes('Demand Graph')) {
          baseFilename = 'DemandGraph';
          console.log('✅ Matched Demand Graph');
        } else if (reportTitle.includes('Line Graph')) {
          baseFilename = 'LineGraph';
          console.log('✅ Matched Line Graph');
        } else if (reportTitle.includes('Compare Graph')) {
          baseFilename = 'CompareGraph';
          console.log('✅ Matched Compare Graph');
        } else if (reportTitle.includes('TOU-Demand') || reportTitle.includes('TOU Demand')) {
          baseFilename = 'TOU-Demand';
          console.log('✅ Matched TOU-Demand');
        } else {
          console.log('❌ No match found, using default TableData');
        }
      } else {
        console.log('❌ No reportTitle provided, using default TableData');
      }
      filename = `${baseFilename}_${format(new Date(), 'ddMMyyyy')}.csv`;
      console.log('📁 Final CSV filename:', filename);
      contentType = 'text/csv';
      
    } else if (exportType === 'image') {
      // ตรวจสอบว่ามี customImageData หรือไม่
      if (customImageData) {
        console.log('📧 Using custom image data from frontend');
        // ใช้ image data ที่ส่งมาจาก frontend
        const base64Data = customImageData.replace(/^data:image\/png;base64,/, '');
        attachment = Buffer.from(base64Data, 'base64');
        
        // กำหนดชื่อไฟล์ตาม reportTitle
        let baseFilename = 'TableData';
        if (reportTitle) {
          if (reportTitle.includes('Energy Graph')) {
            baseFilename = 'EnergyGraph';
          } else if (reportTitle.includes('Demand Graph')) {
            baseFilename = 'DemandGraph';
          } else if (reportTitle.includes('Line Graph')) {
            baseFilename = 'LineGraph';
          } else if (reportTitle.includes('Compare Graph')) {
            baseFilename = 'CompareGraph';
          } else if (reportTitle.includes('TOU-Demand') || reportTitle.includes('TOU Demand')) {
            baseFilename = 'TOU-Demand';
          }
        }
        filename = `${baseFilename}_${format(new Date(), 'ddMMyyyy')}.png`;
        contentType = 'image/png';
        console.log('📁 Using custom image, filename:', filename);
      } else {
        // สร้าง Image (PNG) จาก table data (วิธีเดิม)
        let createCanvas;
        try {
          ({ createCanvas } = require('canvas'));
        } catch (e) {
          return res.status(500).json({
            success: false,
            error: 'Failed to send email',
            message: "Image export requires 'canvas' module. Install with: npm i canvas --workspace server (or cd server && npm i canvas)"
          });
        }
      
      // กำหนดขนาด canvas - ปรับขนาดตามจำนวนข้อมูล
      const canvasWidth = 1200;
      const headerHeight = 200; // พื้นที่สำหรับ header
      const cellHeight = 30;
      const tableHeaderHeight = cellHeight;
      
      // จำกัดจำนวนแถวสูงสุดเพื่อไม่ให้ไฟล์ใหญ่เกินไป
      const maxDisplayRows = Math.min(tableData.length, 100); // สูงสุด 100 แถว
      const dataRowsHeight = maxDisplayRows * cellHeight;
      const canvasHeight = headerHeight + tableHeaderHeight + dataRowsHeight + 50; // เพิ่ม padding
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      
      // ตั้งค่าพื้นหลัง
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // ตั้งค่าฟอนต์
      ctx.font = '16px Arial';
      ctx.fillStyle = '#000000';
      
      // วาด header
      let y = 40;
      ctx.font = 'bold 24px Arial';
      const imageTitle = reportTitle || 'WebMeter Table Data Report';
      ctx.fillText(imageTitle, 50, y);
      y += 40;
      
      ctx.font = '16px Arial';
      ctx.fillText(`Meter: ${meterName}`, 50, y);
      y += 25;
      ctx.fillText(`Date: ${dateRange}`, 50, y);
      y += 25;
      ctx.fillText(`Time: ${timeRange}`, 50, y);
      y += 25;
      ctx.fillText(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 50, y);
      y += 40;
      
      // วาดตาราง
      if (tableData && tableData.length > 0) {
        let tableColumns;
        if (isOnlineDataFormat) {
          tableColumns = ['Device Name', ...columns];
        } else {
          tableColumns = ['Time', ...columns];
        }
        
        // ปรับขนาด cell ตามจำนวนคอลัมน์
        const minCellWidth = 80; // ขนาดต่ำสุดของ cell
        const availableWidth = canvasWidth - 100;
        const cellWidth = Math.max(availableWidth / tableColumns.length, minCellWidth);
        
        // คำนวณขนาดตารางที่ต้องการ
        const tableWidth = Math.max(canvasWidth - 100, tableColumns.length * cellWidth);
        
        const maxRows = Math.min(tableData.length, 100); // แสดงสูงสุด 100 แถวเพื่อป้องกันไฟล์ใหญ่
        
        // วาด header ของตาราง
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(50, y, tableWidth, cellHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        
        tableColumns.forEach((col, i) => {
          const x = 50 + (i * cellWidth);
          ctx.fillText(col, x + 5, y + 20);
        });
        y += cellHeight;
        
        // วาดข้อมูลในตาราง
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
          const row = tableData[rowIndex];
          const rowY = y + (rowIndex * cellHeight);
          
          // สีพื้นหลังแถว
          if (rowIndex % 2 === 0) {
            ctx.fillStyle = '#f9fafb';
          } else {
            ctx.fillStyle = '#ffffff';
          }
          ctx.fillRect(50, rowY, tableWidth, cellHeight);
          
          // วาดขอบ
          ctx.strokeStyle = '#e5e7eb';
          ctx.strokeRect(50, rowY, tableWidth, cellHeight);
          
          // วาดข้อความ
          ctx.fillStyle = '#000000';
          
          if (isOnlineDataFormat) {
            // OnlineData format: Device Name | Meter 1 | Meter 2 | ...
            const parameterName = row.parameterName || 'Unknown Parameter';
            ctx.fillText(parameterName, 55, rowY + 20);
            
            columns.forEach((col, i) => {
              const x = 50 + ((i + 1) * cellWidth);
              const value = row[col];
              const displayValue = (value === null || value === undefined || value === '') ? '-' : value;
              ctx.fillText(displayValue.toString(), x + 5, rowY + 20);
            });
          } else {
            // TableData format: Time | Column 1 | Column 2 | ...
            const time = row.time || row.reading_timestamp || '';
            ctx.fillText(time, 55, rowY + 20);
            
            columns.forEach((col, i) => {
              const x = 50 + ((i + 1) * cellWidth);
              const value = row[col];
              const displayValue = (value === null || value === undefined || value === '') ? '0.00' : value;
              ctx.fillText(displayValue.toString(), x + 5, rowY + 20);
            });
          }
        }
        
        // ถ้าข้อมูลมีมากกว่า 100 แถว ให้แสดงข้อความแจ้งเตือน
        if (tableData.length > 100) {
          const noticeY = y + (maxRows * cellHeight) + 20;
          ctx.fillStyle = '#ef4444';
          ctx.font = 'italic 12px Arial';
          ctx.fillText(`Note: Showing first ${maxRows} rows out of ${tableData.length} total rows.`, 50, noticeY);
          ctx.fillText('For complete data, please use CSV or PDF export.', 50, noticeY + 15);
        }
      }
      
      attachment = canvas.toBuffer('image/png');
      // กำหนดชื่อไฟล์ตาม reportTitle
      let baseFilename = 'TableData';
      console.log('🔍 PNG Filename Debug:', { reportTitle, hasReportTitle: !!reportTitle });
      if (reportTitle) {
        console.log('🔍 Checking reportTitle:', reportTitle);
        if (reportTitle.includes('Energy Graph')) {
          baseFilename = 'EnergyGraph';
          console.log('✅ Matched Energy Graph');
        } else if (reportTitle.includes('Demand Graph')) {
          baseFilename = 'DemandGraph';
          console.log('✅ Matched Demand Graph');
        } else if (reportTitle.includes('Line Graph')) {
          baseFilename = 'LineGraph';
          console.log('✅ Matched Line Graph');
        } else if (reportTitle.includes('Compare Graph')) {
          baseFilename = 'CompareGraph';
          console.log('✅ Matched Compare Graph');
        } else if (reportTitle.includes('TOU-Demand') || reportTitle.includes('TOU Demand')) {
          baseFilename = 'TOU-Demand';
          console.log('✅ Matched TOU-Demand');
        } else {
          console.log('❌ No match found, using default TableData');
        }
      } else {
        console.log('❌ No reportTitle provided, using default TableData');
      }
      filename = `${baseFilename}_${format(new Date(), 'ddMMyyyy')}.png`;
      console.log('📁 Final PNG filename:', filename);
      contentType = 'image/png';
      }
      
    } else if (exportType === 'text') {
      // สร้าง Text file
      let textContent = '';
      
      // เพิ่มข้อมูล header
      const textTitle = reportTitle || 'WebMeter Report';
      textContent += textTitle + '\n';
      textContent += '='.repeat(50) + '\n\n';
      textContent += `Meter: ${meterName}\n`;
      textContent += `Date: ${dateRange}\n`;
      textContent += `Time: ${timeRange}\n`;
      textContent += `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n\n`;
      
      // เพิ่มข้อมูลตาราง
      if (tableData && tableData.length > 0) {
        let tableColumns, tableRows;
        
        if (isOnlineDataFormat) {
          // OnlineData format: Device Name | Meter 1 | Meter 2 | ...
          tableColumns = ['Device Name', ...columns];
          tableRows = tableData.map(row => [
            row.parameterName || 'Unknown Parameter',
            ...columns.map(col => {
              const value = row[col];
              return (value === null || value === undefined || value === '') ? '-' : value;
            })
          ]);
        } else {
          // TableData format: Time | Column 1 | Column 2 | ...
          tableColumns = ['Time', ...columns];
          tableRows = tableData.map(row => [
            row.time || row.reading_timestamp || '',
            ...columns.map(col => {
              const value = row[col];
              return (value === null || value === undefined || value === '') ? '0.00' : value;
            })
          ]);
        }
        
        // สร้างตารางแบบ text
        const colWidths = tableColumns.map((header, i) => 
          Math.max(header.length, ...tableRows.map(row => (row[i] || '').toString().length), 10)
        );
        
        // Header
        const headerLine = tableColumns.map((header, i) => 
          header.padEnd(colWidths[i])
        ).join(' | ');
        textContent += headerLine + '\n';
        
        // Separator
        const separatorLine = colWidths.map(width => '-'.repeat(width)).join('-+-');
        textContent += separatorLine + '\n';
        
        // Data rows
        tableRows.forEach(row => {
          const dataLine = row.map((cell, i) => 
            (cell || '').toString().padEnd(colWidths[i])
          ).join(' | ');
          textContent += dataLine + '\n';
        });
      }
      
      textContent += '\n' + '='.repeat(50) + '\n';
      textContent += `End of Report - Total ${tableData.length} records\n`;
      
      attachment = Buffer.from(textContent, 'utf8');
      // กำหนดชื่อไฟล์ตาม reportTitle
      let baseFilename = 'TableData';
      console.log('🔍 TXT Filename Debug:', { reportTitle, hasReportTitle: !!reportTitle });
      if (reportTitle) {
        console.log('🔍 Checking reportTitle:', reportTitle);
        if (reportTitle.includes('Energy Graph')) {
          baseFilename = 'EnergyGraph';
          console.log('✅ Matched Energy Graph');
        } else if (reportTitle.includes('Demand Graph')) {
          baseFilename = 'DemandGraph';
          console.log('✅ Matched Demand Graph');
        } else if (reportTitle.includes('Line Graph')) {
          baseFilename = 'LineGraph';
          console.log('✅ Matched Line Graph');
        } else if (reportTitle.includes('Compare Graph')) {
          baseFilename = 'CompareGraph';
          console.log('✅ Matched Compare Graph');
        } else if (reportTitle.includes('TOU-Demand') || reportTitle.includes('TOU Demand')) {
          baseFilename = 'TOU-Demand';
          console.log('✅ Matched TOU-Demand');
        } else {
          console.log('❌ No match found, using default TableData');
        }
      } else {
        console.log('❌ No reportTitle provided, using default TableData');
      }
      filename = `${baseFilename}_${format(new Date(), 'ddMMyyyy')}.txt`;
      console.log('📁 Final TXT filename:', filename);
      contentType = 'text/plain';
    }

    // สร้าง email transporter - ใช้วิธีที่เหมาะสม
    let transporter;
    
    try {
      // ตรวจสอบว่ามี EMAIL_APP_PASSWORD หรือไม่
      if (process.env.EMAIL_APP_PASSWORD) {
        console.log('Using Gmail with App Password...');
        transporter = createTransporter();
      } else if (process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET) {
        console.log('Using Gmail with OAuth2...');
        transporter = createTransporterOAuth2();
      } else {
        console.log('Using Custom SMTP...');
        transporter = createTransporterCustom();
      }
    } catch (error) {
      console.error('Error creating transporter:', error);
      // หากไม่ได้ ลองใช้ Custom SMTP
      try {
        console.log('Trying Custom SMTP as fallback...');
        transporter = createTransporterCustom();
      } catch (fallbackError) {
        console.error('All email methods failed:', fallbackError);
        throw new Error('Failed to create email transporter');
      }
    }

    console.log('Server received to_email:', to_email);
    console.log('Server received to_name:', to_name);
    console.log('Server EMAIL_USER:', process.env.EMAIL_USER);
    console.log('Server received reportTitle:', reportTitle);
    console.log('Server received isDemandGraphFormat:', isDemandGraphFormat);
    console.log('Server received customImageData:', customImageData ? `Yes (${customImageData.length} chars)` : 'No');
    console.log('Server received exportType:', exportType);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to_email,
      subject: subject || `WebMeter ${exportType?.toUpperCase()} Report`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>${reportTitle || 'WebMeter Table Data Report'}</h2>
          <p><strong>Meter:</strong> ${meterName}</p>
          <p><strong>Date:</strong> ${dateRange}</p>
          <p><strong>Time:</strong> ${timeRange}</p>
          <p>Please find the report attached.</p>
        </div>
      `,
      attachments: attachment ? [{
        filename: filename,
        content: attachment,
        contentType: contentType
      }] : []
    };

    // ส่ง email
    console.log(`Sending ${exportType?.toUpperCase()} email to:`, to_email);
    console.log('Email subject:', mailOptions.subject);
    console.log('Attachment filename:', filename);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    });

    res.json({
      success: true,
      message: `${exportType?.toUpperCase()} sent successfully via email`,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// POST /api/email/group - Add a new group to users.email_groups
router.post('/group', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO users.email_groups (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id, name, created_at, updated_at`,
      [name.trim()]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error adding group:', err);
    res.status(500).json({ success: false, error: 'Failed to add group', message: err.message });
  }
});

module.exports = router;