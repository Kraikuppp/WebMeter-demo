import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '@/config/emailjs';

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

export interface EmailData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  export_type: string;
  date_range: string;
  time_range: string;
  meters: string;
  parameters: string;
  pdf_attachment?: string; // PDF as base64 data URI
}

export const sendEmail = async (emailData: EmailData): Promise<{ success: boolean; message: string }> => {
  try {
    // Log from email (sender) if available in config or template
    const fromEmail = EMAILJS_CONFIG.FROM_EMAIL || EMAILJS_CONFIG.from_email || 'sup06.amptronth@gmail.com';
    console.log('📧 Sending email via EmailJS:', {
      from_email: fromEmail,
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      subject: emailData.subject
    });
    
    const result = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      emailData
    );
    
    console.log('✅ Email sent successfully:', result);
    return {
      success: true,
      message: 'Email sent successfully via EmailJS'
    };
    
  } catch (error) {
    console.error('❌ EmailJS error:', error);
    return {
      success: false,
      message: `EmailJS error: ${error}`
    };
  }
};

export const sendBulkEmails = async (emailList: EmailData[]): Promise<{ success: boolean; message: string; results: any[] }> => {
  try {
    console.log('📧 Sending bulk emails via EmailJS:', emailList.length, 'emails');
    
    const results = await Promise.allSettled(
      emailList.map(emailData => sendEmail(emailData))
    );
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
    const failed = results.length - successful;
    
    console.log(`✅ Bulk email results: ${successful} successful, ${failed} failed`);
    
    return {
      success: successful > 0,
      message: `Sent ${successful} emails successfully, ${failed} failed`,
      results: results.map(result => result.status === 'fulfilled' ? result.value : result.reason)
    };
    
  } catch (error) {
    console.error('❌ Bulk email error:', error);
    return {
      success: false,
      message: `Bulk email error: ${error}`,
      results: []
    };
  }
};

// Test EmailJS configuration
export const testEmailJS = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const testData: EmailData = {
      to_email: 'test@example.com',
      to_name: 'Test User',
      subject: 'EmailJS Test',
      message: 'This is a test email from EmailJS',
      export_type: 'test',
      date_range: '2025-09-12',
      time_range: '00:00 - 23:59',
      meters: 'Test Meter',
      parameters: 'Test Parameters'
    };
    
    const result = await sendEmail(testData);
    return result;
    
  } catch (error) {
    return {
      success: false,
      message: `EmailJS test failed: ${error}`
    };
  }
};
