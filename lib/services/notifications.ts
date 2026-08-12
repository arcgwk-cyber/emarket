import { db } from '@/lib/db';
import { notifications, notificationLogs } from '@/lib/db/schema';

/**
 * Sends a simulated or live WhatsApp template notification.
 */
export async function sendWhatsAppNotification(
  userId: string | null,
  mobile: string,
  templateName: string,
  variables: Record<string, any>
) {
  try {
    const payload = { templateName, variables };
    console.log(`📱 [WhatsApp Notification] Sent to ${mobile} via template "${templateName}"`, variables);

    // Save logs to database notification_logs
    await db.insert(notificationLogs).values({
      userId,
      recipient: mobile,
      type: 'whatsapp',
      templateName,
      payload,
      status: 'sent',
    });

  } catch (error) {
    console.error('Failed to log WhatsApp notification:', error);
  }
}

/**
 * Sends a simulated or live Email notification.
 */
export async function sendEmailNotification(
  userId: string | null,
  email: string,
  subject: string,
  templateName: string,
  variables: Record<string, any>
) {
  try {
    const payload = { subject, templateName, variables };
    console.log(`✉️ [Email Notification] Sent to ${email} with subject "${subject}"`, variables);

    // Save logs to database notification_logs
    await db.insert(notificationLogs).values({
      userId,
      recipient: email,
      type: 'email',
      templateName,
      payload,
      status: 'sent',
    });

  } catch (error) {
    console.error('Failed to log Email notification:', error);
  }
}

/**
 * Sends a simulated or live Web Push notification.
 */
export async function sendWebPushNotification(
  userId: string,
  title: string,
  message: string
) {
  try {
    console.log(`🔔 [Web Push Notification] Sent to User ${userId}: "${title}" - ${message}`);

    // Create an in-app notification entry for dashboard notifications inbox
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type: 'order',
      isRead: false,
    });

    // Save logs to database notification_logs
    await db.insert(notificationLogs).values({
      userId,
      recipient: userId,
      type: 'push',
      templateName: 'web_push_alert',
      payload: { title, message },
      status: 'sent',
    });

  } catch (error) {
    console.error('Failed to log Web Push notification:', error);
  }
}
