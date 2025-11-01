const isDevTalent =
  typeof window !== 'undefined' &&
  window.location?.pathname?.startsWith?.('/dev-talent');

import * as real from './api';
import * as mock from './api.mock';

export const getCategories    = (...a:any[]) => (isDevTalent ? (mock as any).getCategories(...a)    : (real as any).getCategories(...a));
export const searchCategories = (...a:any[]) => (isDevTalent ? (mock as any).searchCategories(...a) : (real as any).searchCategories(...a));
export const searchTalents    = (...a:any[]) => (isDevTalent ? (mock as any).searchTalents(...a)    : (real as any).searchTalents(...a));
export const searchJobseekers = (...a:any[]) => (isDevTalent ? (mock as any).searchJobseekers(...a) : (real as any).searchJobseekers(...a));
export const getMyJobPosts    = (...a:any[]) => (isDevTalent ? (mock as any).getMyJobPosts(...a)    : (real as any).getMyJobPosts(...a));
export const sendInvitation   = (...a:any[]) => (isDevTalent ? (mock as any).sendInvitation(...a)   : (real as any).sendInvitation(...a));
