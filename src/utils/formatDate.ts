import { format, parseISO } from 'date-fns';

export function formatDate(dateString: string | Date, formatStr: string = 'dd.MM.yyyy'): string {
    if (!dateString) return '';
    try {
        const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
        return format(date, formatStr);
    } catch (error) {
        return String(dateString);
    }
}
