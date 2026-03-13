export function formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 so\'m';
    return new Intl.NumberFormat('uz-UZ').format(num) + ' so\'m';
}
