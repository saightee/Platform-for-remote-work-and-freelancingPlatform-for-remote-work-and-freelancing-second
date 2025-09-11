// src/services/adminSettings.ts
import { api } from './api';          // только сам инстанс
import { ChatNotificationsSettings } from '@types';

export const getChatNotificationSettings = async (): Promise<ChatNotificationsSettings> => {
  const { data } = await api.get('/admin/settings/chat-notifications');
  return data;
};

export const updateChatNotificationSettings = async (
  payload: Partial<ChatNotificationsSettings>
): Promise<ChatNotificationsSettings> => {
  const { data } = await api.post('/admin/settings/chat-notifications', payload);
  return data;
};

// (опционально) сюда же можно перенести notifyReferralApplicants, чтобы не плодить импортов.
export const notifyReferralApplicants = (
  jobPostId: string,
  payload: {
    limit: number;
    orderBy: 'beginning' | 'end' | 'random';
    titleContains?: string;
    categoryId?: string;
  }
) => api.post(`/admin/job-posts/${jobPostId}/notify-referral-applicants`, payload).then(r => r.data);
