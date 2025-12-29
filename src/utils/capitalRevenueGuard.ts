

/**
 * Capital Revenue Guard
 * Automatically categorizes expenses to prevent capital costs from being treated as immediate deductions
 * 
 * CAPITAL costs are added to cost base and not immediately deductible:
 * - Purchase costs (stamp duty, legal fees, buyer's agent)
 * - Capital improvements (new assets, extensions, renovations)
 * 
 * REVENUE costs are immediately deductible:
 * - Repairs and maintenance (restoring to original condition)
 * - Operating expenses (insurance, rates, property management)
 */

export type ExpenseType = 'capital' | 'revenue';

export interface ExpenseClassification {
    type: ExpenseType;
    category: string;
    isDeductible: boolean;
    addToCostBase: boolean;
    message: string;
    atoReference?: string;
}

// Categories that are ALWAYS capital (add to cost base)
const CAPITAL_CATEGORIES = [
    'Buyers Agent Fees',
    'Stamp Duty',
    'Legal Fees (Purchase)',
    'Building Inspections',
    'Conveyancing Fees',
    'Title Search Fees',
    'Survey Costs',
    'Loan Establishment Fees',
    'Initial Repairs (Before First Rental)',
    'Capital Improvements',
    'Extensions',
    'Renovations',
    'New Fixtures',
    'Structural Changes',
];

// Keywords that suggest CAPITAL treatment
const CAPITAL_KEYWORDS = [
    'new', 'install', 'addition', 'extension', 'upgrade', 'improvement',
    'renovate', 'renovation', 'replace entire', 'structural',
];

// Categories that are ALWAYS revenue (immediately deductible)
const REVENUE_CATEGORIES = [
    'Advertising for Tenants',
    'Body Corporate Fees',
    'Cleaning',
    'Council Rates',
    'Gardening',
    'Insurance',
    'Interest on Loan',
    'Land Tax',
    'Pest Control',
    'Property Agent Fees',
    'Repairs and Maintenance',
    'Stationery',
    'Travel (Inspection)',
    'Water Charges',
];

// Keywords that suggest REPAIR (revenue) treatment
const REPAIR_KEYWORDS = [
    'repair', 'fix', 'mend', 'restore', 'replace part', 'patch',
    'service', 'maintenance', 'cleaning', 'repaint', 'touch up',
];

/**
 * Classify an expense as capital or revenue
 */
export function classifyExpense(
    category: string,
    description: string = '',
): ExpenseClassification {
    const normalizedCategory = category.trim();
    const normalizedDesc = description.toLowerCase().trim();

    // Check explicit capital categories
    if (CAPITAL_CATEGORIES.some(cat =>
        normalizedCategory.toLowerCase().includes(cat.toLowerCase())
    )) {
        return {
            type: 'capital',
            category: normalizedCategory,
            isDeductible: false,
            addToCostBase: true,
            message: 'This is a capital cost and will be added to your cost base. It cannot be claimed as an immediate deduction.',
            atoReference: 'See ATO: Rental properties - capital expenditure',
        };
    }

    // Check explicit revenue categories
    if (REVENUE_CATEGORIES.some(cat =>
        normalizedCategory.toLowerCase().includes(cat.toLowerCase())
    )) {
        return {
            type: 'revenue',
            category: normalizedCategory,
            isDeductible: true,
            addToCostBase: false,
            message: 'This is a deductible expense for the current financial year.',
        };
    }

    // Analyze description for capital keywords
    const hasCapitalKeyword = CAPITAL_KEYWORDS.some(keyword =>
        normalizedDesc.includes(keyword)
    );

    // Analyze description for repair keywords
    const hasRepairKeyword = REPAIR_KEYWORDS.some(keyword =>
        normalizedDesc.includes(keyword)
    );

    // If both keywords present, default to capital (safer)
    if (hasCapitalKeyword && !hasRepairKeyword) {
        return {
            type: 'capital',
            category: normalizedCategory,
            isDeductible: false,
            addToCostBase: true,
            message: 'Based on the description, this appears to be a capital improvement. It will be added to your cost base.',
            atoReference: 'See ATO: Repairs vs improvements',
        };
    }

    if (hasRepairKeyword && !hasCapitalKeyword) {
        return {
            type: 'revenue',
            category: normalizedCategory,
            isDeductible: true,
            addToCostBase: false,
            message: 'Based on the description, this appears to be a repair. It is deductible in the current year.',
        };
    }

    // Default to revenue for unclassified items (with warning)
    return {
        type: 'revenue',
        category: normalizedCategory,
        isDeductible: true,
        addToCostBase: false,
        message: 'Unable to automatically classify. Defaulting to deductible expense. Please verify this is not a capital improvement.',
    };
}

/**
 * Repair vs Capital Improvement guide
 * Key distinction from ATO:
 * - REPAIR: Restores something to its original condition
 * - IMPROVEMENT: Extends beyond original functionality or significantly improves the asset
 */
export interface RepairVsImprovementExample {
    description: string;
    classification: ExpenseType;
    reason: string;
}

export const REPAIR_VS_IMPROVEMENT_EXAMPLES: RepairVsImprovementExample[] = [
    {
        description: 'Replacing a broken window',
        classification: 'revenue',
        reason: 'Restoring to original condition',
    },
    {
        description: 'Replacing all windows with double-glazed',
        classification: 'capital',
        reason: 'Improvement beyond original functionality',
    },
    {
        description: 'Fixing a leaking tap',
        classification: 'revenue',
        reason: 'Repair to restore function',
    },
    {
        description: 'Replacing old hot water system with new',
        classification: 'capital',
        reason: 'Replacement of entire asset',
    },
    {
        description: 'Repainting faded walls',
        classification: 'revenue',
        reason: 'Maintenance to restore appearance',
    },
    {
        description: 'Adding a new room or extension',
        classification: 'capital',
        reason: 'Adds to the property structure',
    },
    {
        description: 'Replacing worn carpet like-for-like',
        classification: 'revenue',
        reason: 'Replacing with equivalent material',
    },
    {
        description: 'Upgrading carpet to timber flooring',
        classification: 'capital',
        reason: 'Improvement to a different material',
    },
];

/**
 * Grey area categories that require user confirmation
 */
export const GREY_AREA_CATEGORIES = [
    'Flooring',
    'Painting',
    'Plumbing',
    'Electrical',
    'Fencing',
    'Appliances',
    'Kitchen',
    'Bathroom',
];

/**
 * Check if a category is a grey area requiring user review
 */
export function isGreyAreaCategory(category: string): boolean {
    return GREY_AREA_CATEGORIES.some(grey =>
        category.toLowerCase().includes(grey.toLowerCase())
    );
}

/**
 * Get helpful guidance for a grey area category
 */
export function getGreyAreaGuidance(category: string): string {
    const guides: Record<string, string> = {
        flooring: 'If replacing like-for-like (e.g., carpet with carpet), it\'s a repair. If upgrading (e.g., carpet to timber), it\'s capital.',
        painting: 'Repainting to maintain appearance is a repair. Complete repainting as part of renovation is capital.',
        plumbing: 'Fixing leaks and replacing taps are repairs. Installing new plumbing systems or relocating is capital.',
        electrical: 'Fixing faults and replacing switches are repairs. Rewiring or adding new circuits is capital.',
        fencing: 'Repairing damaged sections is deductible. Replacing entire fence or building new fence is capital.',
        appliances: 'Repairing appliances is deductible. Replacing with new appliances is capital (but can be depreciated).',
        kitchen: 'Minor repairs are deductible. Kitchen renovations and new cabinets are capital improvements.',
        bathroom: 'Minor repairs are deductible. Bathroom renovations are capital improvements.',
    };

    const key = Object.keys(guides).find(k =>
        category.toLowerCase().includes(k)
    );

    return key ? guides[key] : 'Please review the ATO guidance on repairs vs capital improvements.';
}
