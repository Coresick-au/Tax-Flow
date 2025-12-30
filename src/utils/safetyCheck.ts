import Decimal from 'decimal.js';
import type { SafetyCheckItem } from '../types';

/**
 * ATO Average Deductions by Occupation Code
 * Source: ATO occupation deduction averages (for demonstration)
 * In production, these would be updated annually from ATO data
 */
export const ATO_OCCUPATION_AVERAGES: Record<string, OccupationAverages> = {
    // Software Engineer / Developer
    '261312': {
        occupationName: 'Software Developer',
        averages: {
            work_clothing: 50,
            tools_equipment: 800,
            self_education: 1200,
            travel: 200,
            phone_internet: 400,
            professional_subscriptions: 300,
            car_expenses: 150,
            home_office: 1500,
            other: 200,
        },
        thresholds: {
            safe: 1.3,    // Up to 130% of average
            warning: 2.0, // Up to 200% of average
            // Above 200% = danger
        },
    },
    // Accountant
    '221111': {
        occupationName: 'Accountant',
        averages: {
            work_clothing: 100,
            tools_equipment: 400,
            self_education: 2000,
            travel: 500,
            phone_internet: 350,
            professional_subscriptions: 800,
            car_expenses: 600,
            home_office: 800,
            other: 300,
        },
        thresholds: {
            safe: 1.3,
            warning: 2.0,
        },
    },
    // Nurse
    '254499': {
        occupationName: 'Nurse',
        averages: {
            work_clothing: 300,
            tools_equipment: 200,
            self_education: 1500,
            travel: 100,
            phone_internet: 150,
            professional_subscriptions: 400,
            car_expenses: 800,
            home_office: 100,
            other: 150,
        },
        thresholds: {
            safe: 1.3,
            warning: 2.0,
        },
    },
    // Teacher
    '241111': {
        occupationName: 'Secondary School Teacher',
        averages: {
            work_clothing: 200,
            tools_equipment: 400,
            self_education: 1000,
            travel: 150,
            phone_internet: 200,
            professional_subscriptions: 350,
            car_expenses: 400,
            home_office: 600,
            other: 200,
        },
        thresholds: {
            safe: 1.3,
            warning: 2.0,
        },
    },
    // Default fallback
    'default': {
        occupationName: 'General Worker',
        averages: {
            work_clothing: 150,
            tools_equipment: 300,
            self_education: 500,
            travel: 200,
            phone_internet: 250,
            professional_subscriptions: 200,
            car_expenses: 400,
            home_office: 500,
            other: 200,
        },
        thresholds: {
            safe: 1.5,
            warning: 2.5,
        },
    },
};

interface OccupationAverages {
    occupationName: string;
    averages: Record<string, number>;
    thresholds: {
        safe: number;
        warning: number;
    };
}

export interface SafetyCheckResult {
    overallRisk: 'low' | 'medium' | 'high';
    riskPercentage: number; // 0-100 for gauge positioning
    items: SafetyCheckItem[];
    occupationCode: string;
    occupationName: string;
    totalUserDeductions: Decimal;
    totalAtoAverage: Decimal;
}

/**
 * Calculate safety check results comparing user deductions to ATO averages
 */
export function calculateSafetyCheck(
    userDeductions: Record<string, Decimal>,
    occupationCode: string = 'default'
): SafetyCheckResult {
    // Get occupation averages (fallback to default)
    const occupation = ATO_OCCUPATION_AVERAGES[occupationCode] || ATO_OCCUPATION_AVERAGES['default'];

    const items: SafetyCheckItem[] = [];
    let totalUserAmount = new Decimal(0);
    let totalAtoAmount = new Decimal(0);
    let warningCount = 0;
    let dangerCount = 0;

    const MATERIALITY_THRESHOLD = 300;

    // Check each deduction category
    for (const [category, userAmount] of Object.entries(userDeductions)) {
        const atoAverage = occupation.averages[category] || 0;
        const atoAverageDecimal = new Decimal(atoAverage);

        totalUserAmount = totalUserAmount.add(userAmount);
        totalAtoAmount = totalAtoAmount.add(atoAverageDecimal);

        // Skip zero amounts
        if (userAmount.isZero() && atoAverage === 0) continue;

        // Calculate ratio
        const ratio = atoAverage > 0 ? userAmount.div(atoAverage).toNumber() : userAmount.toNumber() > 0 ? 999 : 0;

        // Determine status
        let status: 'safe' | 'warning' | 'danger';
        let message: string;

        if (ratio <= occupation.thresholds.safe) {
            status = 'safe';
            message = 'Within ATO average range';
        } else if (ratio <= occupation.thresholds.warning) {
            status = 'warning';
            message = `${((ratio - 1) * 100).toFixed(0)}% above ATO average - may attract scrutiny`;
            warningCount++;
        } else {
            // Apply Materiality Threshold: If amount is small (< $300), don't flag as danger
            if (userAmount.toNumber() <= MATERIALITY_THRESHOLD) {
                status = 'safe'; // or 'warning' if preferred, but 'safe' avoids alarm for trivial amounts
                message = 'Above average percentage, but amount is low (low risk)';
            } else {
                status = 'danger';
                message = `Significantly above ATO average - high audit risk`;
                dangerCount++;
            }
        }

        items.push({
            category: formatCategoryName(category),
            userAmount,
            atoAverage: atoAverageDecimal,
            status,
            message,
        });
    }

    // Calculate overall risk
    let overallRisk: 'low' | 'medium' | 'high';
    let riskPercentage: number;

    if (dangerCount > 0) {
        overallRisk = 'high';
        riskPercentage = 75 + Math.min(dangerCount * 5, 25); // 75-100%
    } else if (warningCount > 2) {
        overallRisk = 'high';
        riskPercentage = 70;
    } else if (warningCount > 0) {
        overallRisk = 'medium';
        riskPercentage = 35 + warningCount * 10; // 35-65%
    } else {
        overallRisk = 'low';
        // Calculate based on overall ratio to average
        const overallRatio = totalAtoAmount.isZero()
            ? 0
            : totalUserAmount.div(totalAtoAmount).toNumber();
        riskPercentage = Math.min(overallRatio * 20, 33); // 0-33%
    }

    return {
        overallRisk,
        riskPercentage,
        items: items.sort((a, b) => {
            // Sort by risk level (danger first, then warning, then safe)
            const order = { danger: 0, warning: 1, safe: 2 };
            return order[a.status] - order[b.status];
        }),
        occupationCode,
        occupationName: occupation.occupationName,
        totalUserDeductions: totalUserAmount,
        totalAtoAverage: totalAtoAmount,
    };
}

/**
 * Format category key to readable name
 */
function formatCategoryName(category: string): string {
    const names: Record<string, string> = {
        work_clothing: 'Work Clothing & Uniforms',
        tools_equipment: 'Tools & Equipment',
        self_education: 'Self-Education',
        travel: 'Work Travel',
        phone_internet: 'Phone & Internet',
        professional_subscriptions: 'Professional Subscriptions',
        car_expenses: 'Car Expenses',
        home_office: 'Home Office',
        union_fees: 'Union Fees',
        other: 'Other Deductions',
    };
    return names[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get risk level color class
 */
export function getRiskColor(risk: 'low' | 'medium' | 'high'): string {
    switch (risk) {
        case 'low': return 'text-success';
        case 'medium': return 'text-warning';
        case 'high': return 'text-danger';
    }
}

/**
 * Get risk level background class
 */
export function getRiskBgColor(risk: 'low' | 'medium' | 'high'): string {
    switch (risk) {
        case 'low': return 'bg-success/10 border-success/30';
        case 'medium': return 'bg-warning/10 border-warning/30';
        case 'high': return 'bg-danger/10 border-danger/30';
    }
}

/**
 * Map receipt category to ATO standard category
 */
export function mapReceiptCategoryToAtoCategory(receiptCategory: string): string {
    const mapping: Record<string, string> = {
        // Work clothing
        'uniforms': 'work_clothing',
        'work_clothing': 'work_clothing',
        'protective_clothing': 'work_clothing',
        'laundry': 'work_clothing',

        // Tools & Equipment
        'equipment': 'tools_equipment',
        'tools': 'tools_equipment',
        'software': 'tools_equipment',
        'computer_equipment': 'tools_equipment',
        'office_supplies': 'tools_equipment',

        // Self Education
        'education': 'self_education',
        'training': 'self_education',
        'courses': 'self_education',
        'books': 'self_education',
        'conferences': 'self_education',

        // Travel
        'travel': 'travel',
        'accommodation': 'travel',
        'meals_travel': 'travel',

        // Phone & Internet
        'phone': 'phone_internet',
        'internet': 'phone_internet',
        'mobile': 'phone_internet',
        'telecommunications': 'phone_internet',

        // Professional
        'subscriptions': 'professional_subscriptions',
        'memberships': 'professional_subscriptions',
        'professional_fees': 'professional_subscriptions',
        'union_fees': 'professional_subscriptions',

        // Vehicle
        'car': 'car_expenses',
        'vehicle': 'car_expenses',
        'parking': 'car_expenses',
        'fuel': 'car_expenses',

        // Home Office
        'home_office': 'home_office',
        'wfh': 'home_office',
        'utilities': 'home_office',

        // Default
        'other': 'other',
    };

    const normalized = receiptCategory.toLowerCase().replace(/[\s-]+/g, '_');
    return mapping[normalized] || 'other';
}
