import Decimal from 'decimal.js';
import type { TaxSettings } from '../types';

export type WfhMethod = 'fixed_rate' | 'actual_cost';

export interface ActualCostInputs {
    electricity: string;
    internet: string;
    cleaning: string;
    phoneUsage: string;
    stationery: string;
    furnitureDepreciation: string;
}

export interface WfhCalculationResult {
    method: WfhMethod;
    totalHours: number;
    ratePerHour: Decimal;
    totalDeduction: Decimal;
    breakdown: {
        label: string;
        amount: Decimal;
    }[];
}

/**
 * Calculate Work From Home deduction using the Fixed Rate method
 * ATO 2024-25 rate: $0.67 per hour
 * 
 * This method covers:
 * - Electricity and gas for heating/cooling/lighting
 * - Phone and internet usage
 * - Stationery and computer consumables
 * 
 * Additional deductions (claimed separately):
 * - Decline in value of equipment (e.g., laptop, desk)
 */
export function calculateWfhFixedRate(
    totalHours: number,
    taxSettings: TaxSettings
): WfhCalculationResult {
    const ratePerHour = new Decimal(taxSettings.wfhFixedRate || '0.67');
    const totalDeduction = ratePerHour.mul(totalHours);

    return {
        method: 'fixed_rate',
        totalHours,
        ratePerHour,
        totalDeduction,
        breakdown: [
            {
                label: `${totalHours} hours × $${ratePerHour.toFixed(2)}/hr`,
                amount: totalDeduction,
            },
        ],
    };
}

/**
 * Calculate Work From Home deduction using the Actual Cost method
 * Requires keeping detailed records of actual expenses incurred
 * 
 * Each expense is calculated as:
 * Annual expense × Work use percentage
 */
export function calculateWfhActualCost(
    actualCosts: ActualCostInputs,
    workUsePercentage: number = 100
): WfhCalculationResult {
    const workUseFraction = new Decimal(workUsePercentage).div(100);

    const electricity = new Decimal(actualCosts.electricity || '0').mul(workUseFraction);
    const internet = new Decimal(actualCosts.internet || '0').mul(workUseFraction);
    const cleaning = new Decimal(actualCosts.cleaning || '0').mul(workUseFraction);
    const phoneUsage = new Decimal(actualCosts.phoneUsage || '0').mul(workUseFraction);
    const stationery = new Decimal(actualCosts.stationery || '0').mul(workUseFraction);
    const furniture = new Decimal(actualCosts.furnitureDepreciation || '0').mul(workUseFraction);

    const totalDeduction = electricity
        .add(internet)
        .add(cleaning)
        .add(phoneUsage)
        .add(stationery)
        .add(furniture);

    const breakdown = [
        { label: 'Electricity (heating/cooling/lighting)', amount: electricity },
        { label: 'Internet', amount: internet },
        { label: 'Phone usage', amount: phoneUsage },
        { label: 'Cleaning (home office area)', amount: cleaning },
        { label: 'Stationery & consumables', amount: stationery },
        { label: 'Furniture depreciation', amount: furniture },
    ].filter(item => !item.amount.isZero());

    return {
        method: 'actual_cost',
        totalHours: 0, // Not used for actual cost method
        ratePerHour: new Decimal(0),
        totalDeduction,
        breakdown,
    };
}

/**
 * Calculate WFH deduction based on selected method
 */
export function calculateWfhDeduction(
    method: WfhMethod,
    totalHours: number,
    actualCosts: ActualCostInputs | null,
    workUsePercentage: number,
    taxSettings: TaxSettings
): WfhCalculationResult {
    if (method === 'fixed_rate') {
        return calculateWfhFixedRate(totalHours, taxSettings);
    }

    if (actualCosts) {
        return calculateWfhActualCost(actualCosts, workUsePercentage);
    }

    // Fallback to zero if no actual costs provided
    return {
        method: 'actual_cost',
        totalHours: 0,
        ratePerHour: new Decimal(0),
        totalDeduction: new Decimal(0),
        breakdown: [],
    };
}

/**
 * Validate WFH hours input
 * Maximum reasonable hours: 52 weeks × 7 days × 24 hours = 8,736
 * More realistic max: 52 weeks × 5 days × 12 hours = 3,120
 */
export function validateWfhHours(hours: number): { valid: boolean; message?: string } {
    if (hours < 0) {
        return { valid: false, message: 'Hours cannot be negative' };
    }

    if (hours > 3120) {
        return {
            valid: false,
            message: 'Hours exceed reasonable limit (3,120 hours = 12 hours/day for 52 weeks)'
        };
    }

    if (hours > 2080) {
        return {
            valid: true,
            message: 'Warning: Hours exceed typical full-time work year (2,080 hours)'
        };
    }

    return { valid: true };
}

/**
 * Get ATO-recommended maximum hours for audit safety
 */
export function getRecommendedMaxHours(occupationType: string): number {
    // Conservative estimates based on occupation type
    const maxHours: Record<string, number> = {
        'full_time_office': 1600, // ~8 hrs/day, 200 days
        'full_time_mixed': 800,   // ~4 hrs/day WFH
        'part_time': 600,
        'contractor': 1800,
        'default': 1200,
    };

    return maxHours[occupationType] || maxHours['default'];
}
