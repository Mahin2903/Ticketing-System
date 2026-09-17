const nodemailer = require("nodemailer");
require("dotenv").config();

const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;
const mailHost = process.env.MAIL_HOST;
const mailPort = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined;
const mailService = process.env.MAIL_SERVICE;

/**
 * Configure Nodemailer transport.
 * Supports:
 * 1. Explicit MAIL_HOST + MAIL_PORT
 * 2. Explicit MAIL_SERVICE (e.g. 'gmail')
 * 3. Default to Gmail / Google Workspace (smtp.gmail.com:465) for just.edu.bd / gmail domains.
 */
const getTransportConfig = () => {
  if (mailHost) {
    return {
      host: mailHost,
      port: mailPort || 465,
      secure: mailPort === 465 || process.env.MAIL_SECURE === "true",
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    };
  }

  if (mailService) {
    return {
      service: mailService,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    };
  }

  // Default: Google Workspace / Gmail SMTP
  return {
    service: "gmail",
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  };
};

const transporter = nodemailer.createTransport(getTransportConfig());

const defaultFrom =
  process.env.MAIL_FROM ||
  (mailUser
    ? `Support Ticketing System <${mailUser}>`
    : "Support Ticketing System <no-reply@just.edu.bd>");

/**
 * Verifies if current SMTP credentials and connection are functional.
 */
const verifyMailConnection = async () => {
  if (!mailUser || !mailPass) {
    return {
      success: false,
      message: "MAIL_USER or MAIL_PASS is not configured in .env",
    };
  }

  try {
    await transporter.verify();
    return { success: true, message: "SMTP connection verified successfully." };
  } catch (error) {
    return { success: false, message: error.message, code: error.code };
  }
};

module.exports = {
  transporter,
  defaultFrom,
  verifyMailConnection,
};
