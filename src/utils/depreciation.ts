import Decimal from 'decimal.js';

export type DepreciationMethod = 'diminishing_value' | 'prime_cost';

export interface AssetDepreciationInput {
    cost: string;
    effectiveLifeYears: number;
    purchaseDate: Date;
    method: DepreciationMethod;
    workUsePercentage: number; // 0-100
    financialYearEnd: Date; // e.g., June 30, 2025
}

export interface DepreciationResult {
    method: DepreciationMethod;
    originalCost: Decimal;
    effectiveLifeYears: number;
    daysHeldInYear: number;
    annualRate: Decimal;
    fullYearDeduction: Decimal;
    proratedDeduction: Decimal;
    workUseDeduction: Decimal;
    openingWrittenDownValue: Decimal;
    closingWrittenDownValue: Decimal;
}

/**
 * Calculate depreciation using the Diminishing Value method
 * Formula: Base Value × (Days Held / 365) × (200% / Effective Life)
 * 
 * This method provides higher deductions in earlier years
 */
export function calculateDiminishingValue(
    baseValue: Decimal,
    effectiveLifeYears: number,
    daysHeld: number
): Decimal {
    if (effectiveLifeYears <= 0 || daysHeld <= 0) {
        return new Decimal(0);
    }

    // Rate = 200% / Effective Life
    const rate = new Decimal(200).div(effectiveLifeYears).div(100);

    // Prorate for days held
    const proratedRate = rate.mul(daysHeld).div(365);

    return baseValue.mul(proratedRate);
}

/**
 * Calculate depreciation using the Prime Cost (Straight Line) method
 * Formula: Cost × (Days Held / 365) × (100% / Effective Life)
 * 
 * This method provides equal deductions each year
 */
export function calculatePrimeCost(
    cost: Decimal,
    effectiveLifeYears: number,
    daysHeld: number
): Decimal {
    if (effectiveLifeYears <= 0 || daysHeld <= 0) {
        return new Decimal(0);
    }

    // Rate = 100% / Effective Life
    const rate = new Decimal(100).div(effectiveLifeYears).div(100);

    // Prorate for days held
    const proratedRate = rate.mul(daysHeld).div(365);

    return cost.mul(proratedRate);
}

/**
 * Calculate days held in the financial year
 */
export function calculateDaysHeldInFY(
    purchaseDate: Date,
    financialYearEnd: Date
): number {
    // Financial year starts July 1 of the previous calendar year
    const fyStart = new Date(financialYearEnd);
    fyStart.setFullYear(fyStart.getFullYear() - 1);
    fyStart.setMonth(6); // July
    fyStart.setDate(1);

    // If purchased before FY start, use full year
    const effectiveStart = purchaseDate > fyStart ? purchaseDate : fyStart;

    // If purchased after FY end, no days held
    if (purchaseDate > financialYearEnd) {
        return 0;
    }

    // Calculate days between effective start and FY end
    const diffTime = financialYearEnd.getTime() - effectiveStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.min(Math.max(diffDays, 0), 365);
}

/**
 * Calculate full depreciation for an asset
 */
export function calculateAssetDepreciation(
    input: AssetDepreciationInput,
    previousYearsDepreciation: Decimal = new Decimal(0)
): DepreciationResult {
    const cost = new Decimal(input.cost || '0');
    const daysHeld = calculateDaysHeldInFY(input.purchaseDate, input.financialYearEnd);

    // Opening written-down value (for DV method)
    const openingWDV = cost.sub(previousYearsDepreciation);

    let fullYearDeduction: Decimal;
    let proratedDeduction: Decimal;
    let annualRate: Decimal;

    if (input.method === 'diminishing_value') {
        annualRate = new Decimal(200).div(input.effectiveLifeYears);
        fullYearDeduction = openingWDV.mul(annualRate).div(100);
        proratedDeduction = calculateDiminishingValue(openingWDV, input.effectiveLifeYears, daysHeld);
    } else {
        annualRate = new Decimal(100).div(input.effectiveLifeYears);
        fullYearDeduction = cost.mul(annualRate).div(100);
        proratedDeduction = calculatePrimeCost(cost, input.effectiveLifeYears, daysHeld);
    }

    // Apply work use percentage
    const workUseFraction = new Decimal(input.workUsePercentage).div(100);
    const workUseDeduction = proratedDeduction.mul(workUseFraction);

    // Closing written-down value
    const closingWDV = openingWDV.sub(proratedDeduction);

    return {
        method: input.method,
        originalCost: cost,
        effectiveLifeYears: input.effectiveLifeYears,
        daysHeldInYear: daysHeld,
        annualRate,
        fullYearDeduction,
        proratedDeduction,
        workUseDeduction,
        openingWrittenDownValue: openingWDV,
        closingWrittenDownValue: Decimal.max(closingWDV, new Decimal(0)),
    };
}

/**
 * Determine if an asset should be immediately written off
 * Based on instant asset write-off threshold
 */
export function canInstantWriteOff(
    cost: Decimal,
    threshold: string = '20000'
): boolean {
    return cost.lte(new Decimal(threshold));
}

/**
 * Determine if asset should use low-value pool
 * Assets < $1,000 can be pooled for simpler depreciation
 */
export function shouldUseLowValuePool(
    writtenDownValue: Decimal,
    threshold: string = '1000'
): boolean {
    return writtenDownValue.lt(new Decimal(threshold));
}

/**
 * Common effective life values for work-related assets
 * Based on ATO's Table of Effective Life
 */
export const COMMON_ASSET_EFFECTIVE_LIVES: Record<string, number> = {
    'laptop': 4,
    'desktop_computer': 4,
    'mobile_phone': 3,
    'tablet': 2,
    'monitor': 5,
    'printer': 5,
    'office_furniture': 10,
    'desk': 10,
    'chair': 10,
    'bookshelf': 15,
    'tools_general': 5,
    'camera': 5,
    'software': 2.5,
};

/**
 * Get effective life for a common asset type
 */
export function getEffectiveLife(assetType: string): number {
    return COMMON_ASSET_EFFECTIVE_LIVES[assetType.toLowerCase()] || 5;
}
