import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationRepository {
  /**
   * Create a notification
   * @param sender_id - The ID of the user who fired the event
   * @param receiver_id - The ID of the user to notify
   * @param text - The text of the notification
   * @param type - The type of the notification
   * @param entity_id - The ID of the entity related to the notification
   * @returns The created notification
   */
  static async createNotification({
    sender_id,
    receiver_id,
    text,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    text?: string;
    type?:
      | 'message'
      | 'comment'
      | 'review'
      | 'booking'
      | 'payment_transaction'
      | 'package'
      | 'blog';
    entity_id?: string;
  }) {
    // Step 1: Find or create the notification event to avoid duplicates.
    let notificationEvent = await prisma.notificationEvent.findFirst({
      where: {
        type: type,
        text: text,
      },
    });

    // If the event doesn't exist, create a new one.
    if (!notificationEvent) {
      notificationEvent = await prisma.notificationEvent.create({
        data: {
          type: type,
          text: text,
        },
      });
    }

    // Step 2: Create the notification and link it to the event.
    const notificationData: {
      sender_id?: string;
      receiver_id?: string;
      entity_id?: string;
      notification_event_id: string;
    } = {
      notification_event_id: notificationEvent.id,
    };

    if (sender_id) {
      notificationData.sender_id = sender_id;
    }
    if (receiver_id) {
      notificationData.receiver_id = receiver_id;
    }
    if (entity_id) {
      notificationData.entity_id = entity_id;
    }

    const newNotification = await prisma.notification.create({
      data: notificationData,
      include: {
        sender: true, // Include sender's user data
        receiver: true, // Include receiver's user data
        notification_event: true, // Include the event details
      },
    });

    return newNotification;
  }
}
