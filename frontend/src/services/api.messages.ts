// src/services/api.messages.ts

const isDevMessages =
  typeof window !== 'undefined' &&
  window.location?.pathname?.startsWith?.('/dev-messages');

import * as real from './api';
import * as mock from './api.messages.mock';

// 1) getMyApplications
export const getMyApplications = (
  ...args: Parameters<typeof real.getMyApplications>
): ReturnType<typeof real.getMyApplications> =>
  isDevMessages
    ? (mock.getMyApplications as any)(...args)
    : real.getMyApplications(...args);

// 2) getMyJobPosts
export const getMyJobPosts = (
  ...args: Parameters<typeof real.getMyJobPosts>
): ReturnType<typeof real.getMyJobPosts> =>
  isDevMessages
    ? (mock.getMyJobPosts as any)(...args)
    : real.getMyJobPosts(...args);

// 3) getApplicationsForJobPost
export const getApplicationsForJobPost = (
  ...args: Parameters<typeof real.getApplicationsForJobPost>
): ReturnType<typeof real.getApplicationsForJobPost> =>
  isDevMessages
    ? (mock.getApplicationsForJobPost as any)(...args)
    : real.getApplicationsForJobPost(...args);

// 4) getChatHistory
export const getChatHistory = (
  ...args: Parameters<typeof real.getChatHistory>
): ReturnType<typeof real.getChatHistory> =>
  isDevMessages
    ? (mock.getChatHistory as any)(...args)
    : real.getChatHistory(...args);

// 5) createReview
export const createReview = (
  ...args: Parameters<typeof real.createReview>
): ReturnType<typeof real.createReview> =>
  isDevMessages
    ? (mock.createReview as any)(...args)
    : real.createReview(...args);

// 6) broadcastToApplicants
export const broadcastToApplicants = (
  ...args: Parameters<typeof real.broadcastToApplicants>
): ReturnType<typeof real.broadcastToApplicants> =>
  isDevMessages
    ? (mock.broadcastToApplicants as any)(...args)
    : real.broadcastToApplicants(...args);

// 7) broadcastToSelected
export const broadcastToSelected = (
  ...args: Parameters<typeof real.broadcastToSelected>
): ReturnType<typeof real.broadcastToSelected> =>
  isDevMessages
    ? (mock.broadcastToSelected as any)(...args)
    : real.broadcastToSelected(...args);

// 8) bulkRejectApplications
export const bulkRejectApplications = (
  ...args: Parameters<typeof real.bulkRejectApplications>
): ReturnType<typeof real.bulkRejectApplications> =>
  isDevMessages
    ? (mock.bulkRejectApplications as any)(...args)
    : real.bulkRejectApplications(...args);

// 9) updateApplicationStatus
export const updateApplicationStatus = (
  ...args: Parameters<typeof real.updateApplicationStatus>
): ReturnType<typeof real.updateApplicationStatus> =>
  isDevMessages
    ? (mock.updateApplicationStatus as any)(...args)
    : real.updateApplicationStatus(...args);

// 10) closeJobPost
export const closeJobPost = (
  ...args: Parameters<typeof real.closeJobPost>
): ReturnType<typeof real.closeJobPost> =>
  isDevMessages
    ? (mock.closeJobPost as any)(...args)
    : real.closeJobPost(...args);
