// api.ftl.ts

const isBrowser = typeof window !== 'undefined';

const isDevTalent =
  isBrowser &&
  window.location?.pathname?.startsWith?.('/dev-talent');

const isDevPublicProfile =
  isBrowser &&
  window.location?.pathname?.startsWith?.('/dev-public-profile');

const isDevHome =
  isBrowser &&
  window.location?.pathname?.startsWith?.('/dev-home');

const isDevJobs =
  isBrowser &&
  window.location?.pathname?.startsWith?.('/dev-jobs');

// Объединяем условия
const isDevTalentLike = isDevTalent || isDevPublicProfile;
const isDevHomeLike = isDevHome;
const isDevJobsLike = isDevJobs;

import * as real from './api';
import * as mock from './api.mock';

// Talents
export const getCategories = (...a: any[]) =>
  isDevTalentLike || isDevJobsLike
    ? (mock as any).getCategories(...a)
    : (real as any).getCategories(...a);

export const searchCategories = (...a: any[]) =>
  isDevTalentLike || isDevJobsLike
    ? (mock as any).searchCategories(...a)
    : (real as any).searchCategories(...a);

export const searchTalents = (...a: any[]) =>
  isDevTalentLike
    ? (mock as any).searchTalents(...a)
    : (real as any).searchTalents(...a);

export const searchJobseekers = (...a: any[]) =>
  isDevTalentLike
    ? (mock as any).searchJobseekers(...a)
    : (real as any).searchJobseekers(...a);

export const getMyJobPosts = (...a: any[]) =>
  isDevTalentLike
    ? (mock as any).getMyJobPosts(...a)
    : (real as any).getMyJobPosts(...a);

export const sendInvitation = (...a: any[]) =>
  isDevTalentLike
    ? (mock as any).sendInvitation(...a)
    : (real as any).sendInvitation(...a);

// Public Profile
export const getUserProfileById = (...a: any[]) =>
  isDevPublicProfile
    ? (mock as any).getUserProfileById(...a)
    : (real as any).getUserProfileById(...a);

export const getReviewsForUser = (...a: any[]) =>
  isDevPublicProfile
    ? (mock as any).getReviewsForUser(...a)
    : (real as any).getReviewsForUser(...a);

export const incrementProfileView = (...a: any[]) =>
  isDevPublicProfile
    ? (mock as any).incrementProfileView(...a)
    : (real as any).incrementProfileView(...a);

// Home Page
export const getHomeFeaturedTalents = (...a: any[]) =>
  isDevHomeLike
    ? (mock as any).getHomeFeaturedTalents(...a)
    : (real as any).getHomeFeaturedTalents(...a);

export const getHomeFeaturedJobs = (...a: any[]) =>
  isDevHomeLike
    ? (mock as any).getHomeFeaturedJobs(...a)
    : (real as any).getHomeFeaturedJobs(...a);

// Jobs
export const searchJobPosts = (...a: any[]) =>
  isDevHomeLike || isDevJobsLike
    ? (mock as any).searchJobPostsMock(...a)
    : (real as any).searchJobPosts(...a);

export const checkJobApplicationStatus = (...a: any[]) =>
  isDevJobsLike
    ? (mock as any).checkJobApplicationStatusMock(...a)
    : (real as any).checkJobApplicationStatus(...a);

// Все остальные функции идут напрямую из real
export * from './api';
