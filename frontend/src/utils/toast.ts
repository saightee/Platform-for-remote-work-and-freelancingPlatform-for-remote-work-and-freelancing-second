import { _emitToast, type ToastItem } from '../components/Toaster';

type ToastType = 'success' | 'error' | 'info';

const push = (type: ToastType, message: string, duration = 3500) => {
  const t: ToastItem = {
    id: crypto.randomUUID(),
    type,
    message,
    duration,
  };
  _emitToast(t);
};

export const toast = {
  success: (msg: string, duration?: number) => push('success', msg, duration),
  error:   (msg: string, duration?: number) => push('error', msg, duration),
  info:    (msg: string, duration?: number) => push('info', msg, duration),
};
