import { requestWithAuth } from './client';
import { getStoredToken } from '../storage';

export type NotificationType =
  | 'service_request'
  | 'service_update'
  | 'payment'
  | 'payment_update'
  | 'payment_required'
  | 'payment_approved'
  | 'vendor_assignment'
  | 'vendor_notification'
  | 'vendor_action_required'
  | 'customer_action_required'
  | 'completion'
  | 'rejection'
  | 'schedule_proposed'
  | 'schedule_accepted'
  | 'schedule_rejected'
  | 'schedule_reminder'
  | 'status_update'
  | 'pickup_scheduled'
  | 'pickup_confirmed'
  | 'drop_scheduled'
  | 'drop_completed'
  | 'timer_expiry'
  | 'verification_required'
  | 'verification_complete'
  | 'problem_identified'
  | 'problem_confirmed'
  | 'problem_rejected';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getUserNotifications() {
  const token = await getStoredToken();
  if (!token) return { error: { message: 'Not authenticated' } };
  
  return requestWithAuth<{ notifications: Notification[] }>('/notifications', token, {
    method: 'GET',
  });
}

export async function markNotificationAsRead(notificationId: string) {
  const token = await getStoredToken();
  if (!token) return { error: { message: 'Not authenticated' } };

  return requestWithAuth<{ message: string; notification: Notification }>(
    `/notifications/${notificationId}/read`,
    token,
    {
      method: 'PATCH',
    }
  );
}

export async function markAllNotificationsAsRead() {
  const token = await getStoredToken();
  if (!token) return { error: { message: 'Not authenticated' } };

  return requestWithAuth<{ message: string; count: number }>(
    '/notifications/mark-all-read',
    token,
    {
      method: 'PATCH',
    }
  );
}

export async function deleteNotification(notificationId: string) {
  const token = await getStoredToken();
  if (!token) return { error: { message: 'Not authenticated' } };

  return requestWithAuth<{ message: string }>(
    `/notifications/${notificationId}`,
    token,
    {
      method: 'DELETE',
    }
  );
}
