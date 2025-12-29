import Decimal from 'decimal.js';
import type { TaxBracket, TaxSettings } from '../types';

/**
 * Calculate income tax based on Australian tax brackets
 * Uses the applicable bracket's base tax + marginal rate for amount over threshold
 */
export function calculateIncomeTax(
    taxableIncome: Decimal,
    taxBrackets: TaxBracket[]
): Decimal {
    const income = taxableIncome.toNumber();

    if (income <= 0) {
        return new Decimal(0);
    }

    // Sort brackets by minIncome ascending
    const sortedBrackets = [...taxBrackets].sort((a, b) => a.minIncome - b.minIncome);

    // Find applicable bracket
    for (let i = sortedBrackets.length - 1; i >= 0; i--) {
        const bracket = sortedBrackets[i];
        if (income >= bracket.minIncome) {
            // Calculate tax: base tax + (income - threshold) * marginal rate
            const taxableInBracket = income - bracket.minIncome + 1;
            const marginalTax = new Decimal(taxableInBracket).mul(bracket.rate).div(100);
            return new Decimal(bracket.baseTax).add(marginalTax);
        }
    }

    return new Decimal(0);
}

/**
 * Calculate Medicare Levy (2% of taxable income above threshold)
 * Threshold for 2024-25: $26,000 (singles)
 */
export function calculateMedicareLevy(
    taxableIncome: Decimal,
    threshold: number = 26000
): Decimal {
    const income = taxableIncome.toNumber();

    if (income <= threshold) {
        return new Decimal(0);
    }

    // Phase-in range: 10% of income above threshold until full 2% applies
    const phaseInLimit = threshold * 1.25; // ~$32,500

    if (income < phaseInLimit) {
        // Shade-in rate: 10% of amount over threshold
        return new Decimal(income - threshold).mul(0.10);
    }

    // Full 2% levy
    return taxableIncome.mul(0.02);
}

/**
 * Calculate total tax payable (income tax + Medicare levy)
 */
export function calculateTotalTax(
    taxableIncome: Decimal,
    taxSettings: TaxSettings
): { incomeTax: Decimal; medicareLevy: Decimal; totalTax: Decimal } {
    const incomeTax = calculateIncomeTax(taxableIncome, taxSettings.taxBrackets);
    const medicareLevy = calculateMedicareLevy(taxableIncome);
    const totalTax = incomeTax.add(medicareLevy);

    return { incomeTax, medicareLevy, totalTax };
}

/**
 * Calculate effective tax rate as a percentage
 */
export function calculateEffectiveTaxRate(
    totalTax: Decimal,
    taxableIncome: Decimal
): Decimal {
    if (taxableIncome.isZero()) {
        return new Decimal(0);
    }
    return totalTax.div(taxableIncome).mul(100);
}

/**
 * Apply ownership percentage to an amount
 * Used for property income/expenses with joint ownership
 */
export function applyOwnershipPercentage(
    amount: Decimal,
    ownershipPercentage: number
): Decimal {
    if (ownershipPercentage <= 0 || ownershipPercentage > 100) {
        return new Decimal(0);
    }
    return amount.mul(ownershipPercentage).div(100);
}

/**
 * Sum an array of string amounts using Decimal.js for precision
 */
export function sumAmounts(amounts: string[]): Decimal {
    return amounts.reduce(
        (sum, amount) => sum.add(new Decimal(amount || '0')),
        new Decimal(0)
    );
}

/**
 * Format a Decimal as Australian currency
 */
export function formatCurrency(amount: Decimal, showSign: boolean = false): string {
    const num = amount.toNumber();
    const formatted = Math.abs(num).toLocaleString('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (showSign) {
        return num >= 0 ? `+${formatted}` : `-${formatted}`;
    }
    return num < 0 ? `-${formatted}` : formatted;
}

/**
 * Parse a currency string to Decimal
 */
export function parseCurrency(value: string): Decimal {
    // Remove currency symbols, commas, and whitespace
    const cleaned = value.replace(/[$,\s]/g, '');
    return new Decimal(cleaned || '0');
}
