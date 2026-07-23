import nodemailer from "nodemailer";
import Contact from "../models/contact.js";

const MAX_NOTIFICATION_ATTEMPTS = 4;
const INITIAL_RETRY_DELAY_MS = 2000;

const pendingNotificationJobs = new Map();

const getAdminRecipient = () => process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
};

const sendEmail = async ({ name, email, message }) => {
  const recipient = getAdminRecipient();

  if (!recipient) {
    throw new Error("ADMIN_EMAIL or EMAIL_USER must be configured");
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipient,
    replyTo: email,
    subject: "📩 New Portfolio Contact Message",
    html: `
      <h3>New Contact Message</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `
  };

  await getTransporter().sendMail(mailOptions);
};

const buildRetryDelay = (attempt) => Math.min(INITIAL_RETRY_DELAY_MS * (2 ** (attempt - 1)), 30000);

export const queueContactNotification = (contactId) => {
  const jobKey = contactId.toString();

  if (pendingNotificationJobs.has(jobKey)) {
    return pendingNotificationJobs.get(jobKey).promise;
  }

  const job = {
    attempts: 0,
    timer: null,
    resolve: null,
    promise: null
  };

  const finalize = () => {
    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = null;
    }

    pendingNotificationJobs.delete(jobKey);
  };

  const runAttempt = async () => {
    try {
      const contact = await Contact.findById(contactId).lean();

      if (!contact) {
        throw new Error("Contact message not found");
      }

      if (contact.notificationSentAt || contact.notificationStatus === "sent") {
        finalize();
        job.resolve?.("already-sent");
        return;
      }

      await sendEmail(contact);

      await Contact.updateOne(
        {
          _id: contactId,
          notificationStatus: { $ne: "sent" }
        },
        {
          $set: {
            notificationStatus: "sent",
            notificationSentAt: new Date(),
            notificationError: null
          }
        }
      );

      finalize();
      job.resolve?.("sent");
    } catch (error) {
      job.attempts += 1;
      console.error(`[Email] Notification attempt ${job.attempts} failed for ${jobKey}: ${error.message}`);

      await Contact.updateOne(
        { _id: contactId },
        {
          $set: {
            notificationStatus: "failed",
            notificationError: error.message
          }
        }
      ).catch((updateError) => {
        console.error(`[Email] Failed to persist notification error for ${jobKey}: ${updateError.message}`);
      });

      if (job.attempts < MAX_NOTIFICATION_ATTEMPTS) {
        const delay = buildRetryDelay(job.attempts);
        console.warn(`[Email] Retrying notification for ${jobKey} in ${delay}ms`);
        job.timer = setTimeout(() => {
          void runAttempt();
        }, delay);
        return;
      }

      finalize();
      job.resolve?.("failed");
    }
  };

  job.promise = new Promise((resolve) => {
    job.resolve = resolve;
  });

  pendingNotificationJobs.set(jobKey, job);
  void runAttempt();

  return job.promise;
};

export default sendEmail;
