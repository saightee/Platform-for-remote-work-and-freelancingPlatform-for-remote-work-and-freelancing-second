
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export const formatDateInTimezone = (dateString?: string, timezone?: string): string => {
  if (!dateString) return 'Not specified';
  try {
    const date = parseISO(dateString);
    if (timezone) {
      const zonedDate = zonedTimeToUtc(date, timezone);
      return format(zonedDate, 'MM/dd/yyyy, HH:mm', { timeZone: timezone });
    }
    return format(date, 'MM/dd/yyyy, HH:mm');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};