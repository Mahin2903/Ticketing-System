const { transporter, defaultFrom } = require("../config/mailer");

/**
 * Send an email using Nodemailer.
 * Safe non-blocking execution: logs errors on failure rather than crashing callers.
 */
const sendMail = async ({ to, subject, text, html }) => {
  if (!to) {
    console.warn("sendMail skipped: recipient email 'to' is required.");
    return { success: false, message: "Recipient email is missing." };
  }

  const mailOptions = {
    from: defaultFrom,
    to: to.trim(),
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // console.log(`✉️ Email sent successfully to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`⚠️ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Step 1: Super Admin Notification on Ticket Creation
 * Sent exclusively to users with role 'SUPER_ADMIN'.
 */
const sendTicketCreatedSuperAdminNotification = async (ticket, superAdmin) => {
  const adminEmail = superAdmin.email || superAdmin;
  const adminName = superAdmin.name || "Super Admin";

  const subject = `[Super Admin Alert] New Ticket Submitted: #${ticket.ticket_number}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #4338ca; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
        .badge-priority { background: #fee2e2; color: #b91c1c; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
        .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .details-table td.label { font-weight: 600; color: #64748b; width: 130px; }
        .message-box { background: #f8fafc; border-left: 4px solid #6366f1; padding: 14px; border-radius: 0 6px 6px 0; margin-top: 10px; font-size: 14px; line-height: 1.6; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Ticket Alert (Super Admin)</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>A new support ticket has been submitted to the platform requiring review or assignment:</p>

          <table class="details-table">
            <tr>
              <td class="label">Ticket Number:</td>
              <td><strong>${ticket.ticket_number}</strong></td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td>${ticket.subject}</td>
            </tr>
            <tr>
              <td class="label">Priority:</td>
              <td><span class="badge badge-priority">${ticket.priority || "MEDIUM"}</span></td>
            </tr>
            <tr>
              <td class="label">User ID:</td>
              <td>${ticket.user_id}</td>
            </tr>
            <tr>
              <td class="label">Mobile:</td>
              <td>${ticket.mobile || "N/A"}</td>
            </tr>
          </table>

          <div style="font-weight: 600; font-size: 14px; color: #475569;">Description:</div>
          <div class="message-box">
            ${ticket.description ? ticket.description.replace(/\n/g, "<br>") : "No description."}
          </div>
        </div>
        <div class="footer">
          Ticketing System &bull; Super Admin Notification
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `[Super Admin Alert] New Ticket Submitted: #${ticket.ticket_number}\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\nUser ID: ${ticket.user_id}\n\nDescription:\n${ticket.description}`;

  return sendMail({ to: adminEmail, subject, text, html });
};

/**
 * Step 2: Ticket Assignment Notification
 * Sent directly to the assigned agent or admin.
 */
const sendTicketAssignedNotification = async (ticket, assignedUser) => {
  const agentEmail = assignedUser.email || assignedUser;
  const agentName = assignedUser.name || "Agent";

  const subject = `[Ticket Assigned] #${ticket.ticket_number}: ${ticket.subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #0284c7; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
        .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .details-table td.label { font-weight: 600; color: #64748b; width: 130px; }
        .message-box { background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px; border-radius: 0 6px 6px 0; margin-top: 10px; font-size: 14px; line-height: 1.6; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ticket Assigned to You</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${agentName}</strong>,</p>
          <p>You have been assigned to handle support ticket <strong>#${ticket.ticket_number}</strong>.</p>

          <table class="details-table">
            <tr>
              <td class="label">Ticket Number:</td>
              <td><strong>${ticket.ticket_number}</strong></td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td>${ticket.subject}</td>
            </tr>
            <tr>
              <td class="label">Priority:</td>
              <td><span class="badge">${ticket.priority || "MEDIUM"}</span></td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td>${ticket.status || "PENDING"}</td>
            </tr>
          </table>

          <div style="font-weight: 600; font-size: 14px; color: #475569;">Description:</div>
          <div class="message-box">
            ${ticket.description ? ticket.description.replace(/\n/g, "<br>") : "No description."}
          </div>
        </div>
        <div class="footer">
          Ticketing System &bull; Assignment Notification
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${agentName},\n\nYou have been assigned ticket #${ticket.ticket_number}.\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\n\nDescription:\n${ticket.description}`;

  return sendMail({ to: agentEmail, subject, text, html });
};

/**
 * Step 3: WebSocket Agent Response Notification
 * Sent to the ticket creator when an AGENT, ADMIN, or SUPER_ADMIN responds.
 */
const sendAgentResponseNotification = async (ticket, creator, reply) => {
  const creatorEmail = creator.email || creator;
  const creatorName = creator.name || "User";
  const agentName = reply.user_name || "Support Staff";
  const agentRole = reply.user_role ? `(${reply.user_role.toUpperCase()})` : "";
  const message = reply.message || "";

  const subject = `[Agent Response] #${ticket.ticket_number}: ${ticket.subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #0f766e; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .reply-meta { font-size: 13px; color: #64748b; margin-bottom: 8px; }
        .reply-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 6px 6px 0; margin-top: 8px; font-size: 15px; line-height: 1.6; color: #064e3b; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Response from Support</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${creatorName}</strong>,</p>
          <p>An agent has replied to your ticket <strong>#${ticket.ticket_number}</strong>:</p>

          <div class="reply-meta">
            From: <strong>${agentName}</strong> ${agentRole}
          </div>
          <div class="reply-box">
            ${message.replace(/\n/g, "<br>")}
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            You can view the conversation or reply directly from your support dashboard.
          </p>
        </div>
        <div class="footer">
          Ticketing System &bull; Support Update
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${creatorName},\n\nAn agent (${agentName} ${agentRole}) replied to ticket #${ticket.ticket_number}:\n\n"${message}"`;

  return sendMail({ to: creatorEmail, subject, text, html });
};

/**
 * Step 4: Ticket Completion Notification
 * Sent to the ticket creator when the ticket status is updated to COMPLETED / COMPLETE.
 */
const sendTicketCompletedNotification = async (ticket, creator) => {
  const creatorEmail = creator.email || creator;
  const creatorName = creator.name || "User";

  const subject = `[Resolved] Ticket #${ticket.ticket_number} has been resolved`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #16a34a; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .badge-resolved { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; background: #dcfce7; color: #15803d; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
        .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .details-table td.label { font-weight: 600; color: #64748b; width: 130px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ticket Resolved</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${creatorName}</strong>,</p>
          <p>Your support ticket has been marked as <strong>COMPLETED</strong>.</p>

          <div style="margin: 16px 0;">
            <span class="badge-resolved">&check; RESOLVED</span>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Ticket Number:</td>
              <td><strong>${ticket.ticket_number}</strong></td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td>${ticket.subject}</td>
            </tr>
            <tr>
              <td class="label">Completed At:</td>
              <td>${ticket.completed_at ? new Date(ticket.completed_at).toLocaleString() : new Date().toLocaleString()}</td>
            </tr>
          </table>

          <p style="font-size: 14px; color: #475569;">
            If you need further assistance with this issue or if it reoccurs, feel free to submit a new ticket or follow up with our support team.
          </p>
        </div>
        <div class="footer">
          Ticketing System &bull; Resolution Notice
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${creatorName},\n\nYour support ticket #${ticket.ticket_number} (${ticket.subject}) has been resolved and marked as COMPLETED.`;

  return sendMail({ to: creatorEmail, subject, text, html });
};

/**
 * Step 5: User Reply Notification
 * Sent to the assigned agent/admin when the ticket creator responds.
 */
const sendUserReplyNotification = async (ticket, staffUser, reply) => {
  const staffEmail = staffUser.email || staffUser;
  const staffName = staffUser.name || "Staff";
  const userName = reply.user_name || "User";
  const message = reply.message || "";

  const subject = `[User Reply] #${ticket.ticket_number}: ${ticket.subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #7c3aed; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .reply-meta { font-size: 13px; color: #64748b; margin-bottom: 8px; }
        .reply-box { background: #faf5ff; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 0 6px 6px 0; margin-top: 8px; font-size: 15px; line-height: 1.6; color: #4c1d95; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
        .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .details-table td.label { font-weight: 600; color: #64748b; width: 130px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Reply from User</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${staffName}</strong>,</p>
          <p>The ticket creator has replied to ticket <strong>#${ticket.ticket_number}</strong>:</p>

          <table class="details-table">
            <tr>
              <td class="label">Ticket Number:</td>
              <td><strong>${ticket.ticket_number}</strong></td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td>${ticket.subject}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td>${ticket.status || "PENDING"}</td>
            </tr>
          </table>

          <div class="reply-meta">
            From: <strong>${userName}</strong> (USER)
          </div>
          <div class="reply-box">
            ${message.replace(/\n/g, "<br>")}
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            You can view and respond to the ticket from the admin dashboard.
          </p>
        </div>
        <div class="footer">
          Ticketing System &bull; User Reply Notification
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${staffName},\n\nUser ${userName} replied to ticket #${ticket.ticket_number}:\n\n"${message}"`;

  return sendMail({ to: staffEmail, subject, text, html });
};

/**
 * Step 6: User Feedback Notification
 * Sent to the assigned staff/admin when the user provides feedback on a completed ticket.
 */
const sendTicketFeedbackNotification = async (ticket, staffUser, feedback) => {
  const staffEmail = staffUser.email || staffUser;
  const staffName = staffUser.name || "Staff";
  const userName = feedback.user_name || "Customer";
  const comment = feedback.comment || "";

  const subject = `[Ticket Feedback] #${ticket.ticket_number}: ${ticket.subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #059669; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .feedback-meta { font-size: 13px; color: #64748b; margin-bottom: 8px; }
        .feedback-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 6px 6px 0; margin-top: 8px; font-size: 15px; line-height: 1.6; color: #065f46; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
        .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .details-table td.label { font-weight: 600; color: #64748b; width: 130px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Customer Feedback</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${staffName}</strong>,</p>
          <p>Customer feedback has been submitted for resolved ticket <strong>#${ticket.ticket_number}</strong>:</p>

          <table class="details-table">
            <tr>
              <td class="label">Ticket Number:</td>
              <td><strong>${ticket.ticket_number}</strong></td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td>${ticket.subject}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td>${ticket.status || "COMPLETE"}</td>
            </tr>
          </table>

          <div class="feedback-meta">
            Feedback from: <strong>${userName}</strong>
          </div>
          <div class="feedback-box">
            ${comment.replace(/\n/g, "<br>")}
          </div>
        </div>
        <div class="footer">
          Ticketing System &bull; Feedback Notification
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${staffName},\n\nCustomer ${userName} submitted feedback for ticket #${ticket.ticket_number}:\n\n"${comment}"`;

  return sendMail({ to: staffEmail, subject, text, html });
};

/**
 * Step 7: Category-Matched User Notification
 * Sent to staff/users whose role_category_id matches the ticket's help_topic_id upon ticket creation.
 */
const sendTicketCategoryMatchedNotification = async (ticket, matchedUser) => {
  const userEmail = matchedUser.email || matchedUser;
  const userName = matchedUser.name || "Support Specialist";
  const categoryTitle = matchedUser.topic_title || "Assigned Category";
  const categoryCode = matchedUser.topic_code ? ` [${matchedUser.topic_code}]` : "";

  const subject = `[New Ticket Alert - ${categoryTitle}] #${ticket.ticket_number}: ${ticket.subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #0d9488; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
        .badge-priority { background: #fee2e2; color: #b91c1c; }
        .category-banner { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 18px; font-size: 14px; color: #134e4a; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
        .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .details-table td.label { font-weight: 600; color: #64748b; width: 140px; }
        .message-box { background: #f8fafc; border-left: 4px solid #0d9488; padding: 14px; border-radius: 0 6px 6px 0; margin-top: 10px; font-size: 14px; line-height: 1.6; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Category Ticket Alert</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <div class="category-banner">
            A new support ticket has been submitted matching your category specialization: <strong>${categoryTitle}${categoryCode}</strong>.
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Ticket Number:</td>
              <td><strong>${ticket.ticket_number}</strong></td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td>${ticket.subject}</td>
            </tr>
            <tr>
              <td class="label">Category:</td>
              <td><strong>${categoryTitle}${categoryCode}</strong></td>
            </tr>
            <tr>
              <td class="label">Priority:</td>
              <td><span class="badge badge-priority">${ticket.priority || "MEDIUM"}</span></td>
            </tr>
            ${ticket.building_name ? `<tr><td class="label">Building:</td><td>${ticket.building_name}</td></tr>` : ""}
            ${ticket.room ? `<tr><td class="label">Room:</td><td>${ticket.room}</td></tr>` : ""}
            ${ticket.pabx ? `<tr><td class="label">PABX:</td><td>${ticket.pabx}</td></tr>` : ""}
            ${ticket.mobile ? `<tr><td class="label">Mobile:</td><td>${ticket.mobile}</td></tr>` : ""}
            <tr>
              <td class="label">Status:</td>
              <td>${ticket.status || "PENDING"}</td>
            </tr>
          </table>

          <div style="font-weight: 600; font-size: 14px; color: #475569;">Description:</div>
          <div class="message-box">
            ${ticket.description ? ticket.description.replace(/\n/g, "<br>") : "No description provided."}
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            Please log in to the dashboard to review, claim, or take action on this ticket.
          </p>
        </div>
        <div class="footer">
          Ticketing System &bull; Category Specialization Alert
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${userName},\n\nA new ticket matching your category (${categoryTitle}${categoryCode}) has been submitted.\n\nTicket: #${ticket.ticket_number}\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\nStatus: ${ticket.status || "PENDING"}\nDescription:\n${ticket.description}`;

  return sendMail({ to: userEmail, subject, text, html });
};

module.exports = {
  sendMail,
  sendTicketCreatedSuperAdminNotification,
  sendTicketAssignedNotification,
  sendAgentResponseNotification,
  sendUserReplyNotification,
  sendTicketCompletedNotification,
  sendTicketFeedbackNotification,
  sendTicketCategoryMatchedNotification,
  // Retain legacy aliases for backward compatibility
  sendTicketCreatedNotification: sendTicketCreatedSuperAdminNotification,
  sendTicketReplyNotification: sendAgentResponseNotification,
};


