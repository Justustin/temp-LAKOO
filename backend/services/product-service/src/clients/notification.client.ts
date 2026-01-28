import axios from 'axios';
import { getServiceAuthHeaders } from '../utils/serviceAuth';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

/**
 * Notification Service Client
 *
 * Handles communication with notification-service
 */

export interface SendNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel?: 'email' | 'whatsapp' | 'push' | 'sms';
  data?: Record<string, any>;
}

export class NotificationServiceClient {
  /**
   * Send notification to user
   */
  async sendNotification(input: SendNotificationInput): Promise<boolean> {
    try {
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        input,
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return true;
    } catch (error: any) {
      console.error('Error sending notification:', error.message);
      return false;
    }
  }

  /**
   * Notify seller about draft approved
   */
  async notifyDraftApproved(
    sellerId: string,
    draftId: string,
    productName: string
  ): Promise<boolean> {
    return await this.sendNotification({
      userId: sellerId,
      type: 'draft_approved',
      title: 'Product Draft Approved! 🎉',
      message: `Your product "${productName}" has been approved and is now live on LAKOO!`,
      channel: 'push',
      data: {
        draftId,
        action: 'view_product'
      }
    });
  }

  /**
   * Notify seller about draft rejected
   */
  async notifyDraftRejected(
    sellerId: string,
    draftId: string,
    productName: string,
    reason: string
  ): Promise<boolean> {
    return await this.sendNotification({
      userId: sellerId,
      type: 'draft_rejected',
      title: 'Product Draft Rejected',
      message: `Your product "${productName}" was rejected. Reason: ${reason}`,
      channel: 'push',
      data: {
        draftId,
        reason,
        action: 'view_draft'
      }
    });
  }

  /**
   * Notify seller about changes requested
   */
  async notifyChangesRequested(
    sellerId: string,
    draftId: string,
    productName: string,
    feedback: string
  ): Promise<boolean> {
    return await this.sendNotification({
      userId: sellerId,
      type: 'draft_changes_requested',
      title: 'Changes Requested on Product Draft',
      message: `Please review and update your product "${productName}". Feedback: ${feedback}`,
      channel: 'push',
      data: {
        draftId,
        feedback,
        action: 'edit_draft'
      }
    });
  }
}

export const notificationServiceClient = new NotificationServiceClient();
