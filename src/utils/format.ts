export function formatCurrency(amount: number): string {
    const formatted = Math.abs(amount).toLocaleString('en-AU', {
        style: 'currency',
        currency: 'AUD',
    });
    return amount < 0 ? `-${formatted}` : `+${formatted}`;
}
