// Load environment variables
require('dotenv').config();

// Nodemailer Configuration
export const NODEMAILER_CONFIG = {
  // Gmail SMTP Configuration
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  
  // Server Configuration
  port: 3003,
  
  // Email Settings
  from: process.env.EMAIL_USER,
  fromName: process.env.EMAIL_FROM_NAME || 'WebMeter System',
  
  // SMTP Settings (Gmail)
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  },
  
  // Alternative SMTP Settings (if needed)
  smtpSecure: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  }
};

// Helper function to create transporter
export const createNodemailerTransporter = () => {
  const nodemailer = require('nodemailer');
  
  return nodemailer.createTransport({
    service: NODEMAILER_CONFIG.service,
    auth: NODEMAILER_CONFIG.auth
  });
};

// Helper function to create SMTP transporter
export const createSMTPTransporter = (useSecure = false) => {
  const nodemailer = require('nodemailer');
  
  const config = useSecure ? NODEMAILER_CONFIG.smtpSecure : NODEMAILER_CONFIG.smtp;
  
  return nodemailer.createTransport(config);
};

// Test function to verify email configuration
export const testEmailConnection = async () => {
  try {
    const transporter = createNodemailerTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is working');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    return false;
  }
};

export default NODEMAILER_CONFIG;