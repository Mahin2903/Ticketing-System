const { verifyMailConnection } = require("../../config/mailer");
const { sendMail } = require("../../services/mail.service");

/**
 * GET /api/mail/verify
 * Check whether SMTP credentials and transporter are able to authenticate.
 */
const verifyConnection = async (req, res) => {
  const result = await verifyMailConnection();

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: "SMTP Connection failed.",
      error: result.message,
      code: result.code,
      tip: "For Google Workspace / Gmail accounts, an App Password is required instead of regular password.",
    });
  }

  return res.json({
    success: true,
    message: result.message,
  });
};

/**
 * POST /api/mail/test
 * Send a test email to a specified recipient.
 */
const sendTestEmail = async (req, res) => {
  const { to } = req.body;

  if (!to || typeof to !== "string" || !to.includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Valid recipient email 'to' is required.",
    });
  }

  const result = await sendMail({
    to,
    subject: "Test Email from Support Ticketing System",
    text: "This is a test email confirming that Nodemailer is successfully configured.",
    html: `
      <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <h2 style="color: #1e40af;">Nodemailer Configuration Test</h2>
        <p>This email confirms that your Nodemailer integration is working correctly!</p>
        <p style="font-size: 12px; color: #64748b;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: "Failed to send test email.",
      error: result.error,
      tip: "Check your SMTP credentials. For Gmail/Google Workspace, generate an App Password in your Google Account.",
    });
  }

  return res.json({
    success: true,
    message: `Test email sent successfully to ${to}.`,
    messageId: result.messageId,
  });
};

module.exports = {
  verifyConnection,
  sendTestEmail,
};
