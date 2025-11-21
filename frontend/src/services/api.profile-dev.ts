// src/services/api.profile-dev.ts

import * as real from './api';
import * as mock from './api.profile-mock';

export const isDevProfilePage =
  typeof window !== 'undefined' &&
  window.location?.pathname?.startsWith?.('/dev-profilepage');

export const getProfile          = (...a: any[]) => (isDevProfilePage ? (mock as any).getProfile(...a)          : (real as any).getProfile(...a));
export const getCategories       = (...a: any[]) => (isDevProfilePage ? (mock as any).getCategories(...a)       : (real as any).getCategories(...a));
export const searchCategories    = (...a: any[]) => (isDevProfilePage ? (mock as any).searchCategories(...a)    : (real as any).searchCategories(...a));
export const updateProfile       = (...a: any[]) => (isDevProfilePage ? (mock as any).updateProfile(...a)       : (real as any).updateProfile(...a));
export const uploadAvatar        = (...a: any[]) => (isDevProfilePage ? (mock as any).uploadAvatar(...a)        : (real as any).uploadAvatar(...a));
export const uploadResume        = (...a: any[]) => (isDevProfilePage ? (mock as any).uploadResume(...a)        : (real as any).uploadResume(...a));
export const uploadPortfolioFiles= (...a: any[]) => (isDevProfilePage ? (mock as any).uploadPortfolioFiles(...a): (real as any).uploadPortfolioFiles(...a));
export const deleteAccount       = (...a: any[]) => (isDevProfilePage ? (mock as any).deleteAccount(...a)       : (real as any).deleteAccount(...a));
