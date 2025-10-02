const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { jsPDF } = require('jspdf');
const { format } = require('date-fns');

// สร้าง transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
};

// ส่งอีเมลสำหรับ calculation modal
router.post('/send', async (req, res) => {
  try {
    const { 
      to_email, 
      to_name, 
      subject, 
      meterName, 
      dateRange, 
      timeRange, 
      exportType,
      reportTitle,
      attachmentData 
    } = req.body;

    console.log('📧 Sending calculation email to:', to_email);
    console.log('📧 Export type:', exportType);
    console.log('📧 Report title:', reportTitle);

    const transporter = createTransporter();

    let attachment = null;
    let filename = '';
    let contentType = '';

    if (attachmentData) {
      if (exportType === 'pdf') {
        // แปลง data URI เป็น buffer - รองรับทั้ง datauristring และ base64
        let base64Data;
        
        console.log('📁 PDF data format check:', {
          startsWithFilename: attachmentData.startsWith('data:application/pdf;filename='),
          startsWithBase64: attachmentData.startsWith('data:application/pdf;base64,'),
          dataPrefix: attachmentData.substring(0, 50)
        });
        
        if (attachmentData.includes('data:application/pdf') && attachmentData.includes('base64,')) {
          // jsPDF datauristring format: data:application/pdf;filename=generated.pdf;base64,xxxxx
          // หา base64 data หลัง comma สุดท้าย
          const parts = attachmentData.split(',');
          base64Data = parts[parts.length - 1];
          console.log('📁 Using jsPDF datauristring format');
        } else if (attachmentData.startsWith('data:application/pdf;base64,')) {
          // Standard base64 format
          base64Data = attachmentData.replace(/^data:application\/pdf;base64,/, '');
          console.log('📁 Using standard base64 format');
        } else {
          // Pure base64 string
          base64Data = attachmentData;
          console.log('📁 Using pure base64 format');
        }
        
        // ตรวจสอบว่า base64 data ถูกต้อง
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Invalid PDF data: base64 string is empty');
        }
        
        // ตรวจสอบ base64 format
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(base64Data)) {
          console.log('⚠️ Base64 validation failed, first 100 chars:', base64Data.substring(0, 100));
          throw new Error('Invalid PDF data: not valid base64 format');
        }
        
        attachment = Buffer.from(base64Data, 'base64');
        filename = `${reportTitle}_${format(new Date(), 'ddMMyyyy')}.pdf`;
        contentType = 'application/pdf';
        
        console.log('📁 PDF attachment created:', {
          originalDataLength: attachmentData.length,
          base64DataLength: base64Data.length,
          bufferSize: attachment.length,
          filename: filename,
          isValidPDF: attachment.length > 0 && attachment[0] === 0x25 && attachment[1] === 0x50 // PDF header check
        });
        
      } else if (exportType === 'image') {
        // แปลง data URI เป็น buffer
        const base64Data = attachmentData.replace(/^data:image\/png;base64,/, '');
        attachment = Buffer.from(base64Data, 'base64');
        filename = `${reportTitle}_${format(new Date(), 'ddMMyyyy')}.png`;
        contentType = 'image/png';
        
        console.log('📁 Image attachment created:', {
          originalDataLength: attachmentData.length,
          base64DataLength: base64Data.length,
          bufferSize: attachment.length,
          filename: filename
        });
        
      } else if (exportType === 'csv') {
        // สำหรับ CSV ข้อมูลจะส่งมาเป็น text string
        attachment = Buffer.from(attachmentData, 'utf8');
        filename = `${reportTitle}_${format(new Date(), 'ddMMyyyy')}.csv`;
        contentType = 'text/csv';
        
        console.log('📁 CSV attachment created:', {
          originalDataLength: attachmentData.length,
          bufferSize: attachment.length,
          filename: filename
        });
        
      } else if (exportType === 'text') {
        // สำหรับ Text ข้อมูลจะส่งมาเป็น text string
        attachment = Buffer.from(attachmentData, 'utf8');
        filename = `${reportTitle}_${format(new Date(), 'ddMMyyyy')}.txt`;
        contentType = 'text/plain';
        
        console.log('📁 Text attachment created:', {
          originalDataLength: attachmentData.length,
          bufferSize: attachment.length,
          filename: filename
        });
      }
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to_email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">WebMeter Billing Report</h2>
          <p>Dear ${to_name},</p>
          <p>Please find attached the billing report for your review.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Report Details:</h3>
            <p><strong>Meter:</strong> ${meterName}</p>
            <p><strong>Date Range:</strong> ${dateRange}</p>
            <p><strong>Time Range:</strong> ${timeRange}</p>
            <p><strong>Export Type:</strong> ${exportType.toUpperCase()}</p>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>WebMeter Team</p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #888;">
            This is an automated email from WebMeter system. Please do not reply to this email.
          </p>
        </div>
      `,
      attachments: attachment ? [{
        filename: filename,
        content: attachment,
        contentType: contentType
      }] : []
    };

    console.log('📧 Sending email with attachment:', filename);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      filename: filename
    });

  } catch (error) {
    console.error('❌ Error sending calculation email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
