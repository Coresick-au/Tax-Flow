import Decimal from 'decimal.js';

// ==================== Core Types ====================

export type FinancialYear = string; // e.g., "2024-2025"

// ==================== User Profile ====================

export interface UserProfile {
    id?: number;
    profileId: string; // Unique identifier for this profile (e.g., UUID)
    financialYear: FinancialYear;
    taxResidency: 'resident' | 'non-resident' | 'working-holiday';
    name: string;
    tfn?: string; // Tax File Number (optional, sensitive)
    occupation: string;
    occupationCode?: string; // ATO occupation code for safety checks
    createdAt: Date;
    updatedAt: Date;
}

// ==================== General Income ====================

export interface IncomeRecord {
    id?: number;
    profileId?: string; // Links to UserProfile.profileId
    financialYear: FinancialYear;
    date: Date;
    category: IncomeCategory;
    amount: string; // Total gross amount (grossAmount + bonuses for salary)
    grossAmount?: string; // Base salary/wages (for salary category)
    bonuses?: string; // Bonuses and commissions (for salary category)
    description: string;
    payer?: string; // e.g. Employer name, Bank name
    taxWithheld?: string; // PAYG withheld
    isTaxFree: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type IncomeCategory =
    | 'salary'
    | 'dividends'
    | 'interest'
    | 'government_payment'
    | 'ato_summary'
    | 'other';

// ==================== Property Types ====================


export interface Property {
    id?: number;
    profileId?: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    propertyType: 'house' | 'unit' | 'townhouse' | 'commercial';
    ownershipSplit: OwnershipSplit[];
    purchaseDate: Date;
    firstRentedDate?: Date;
    costBase: CostBaseItem[];
    status: 'active' | 'sold' | 'inactive';
    saleDate?: Date;
    salePrice?: string;
    imageUrl?: string; // Base64 encoded property image
    // Depreciation helper data
    buildingAge?: string;
    buildingValue?: string;
    hasDepreciationSchedule?: 'yes' | 'no' | 'unknown';
    depreciationScheduleDetails?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OwnershipSplit {
    ownerName: string;
    percentage: number; // 0-100
}

export interface CostBaseItem {
    category: 'purchase_price' | 'stamp_duty' | 'legal_fees' | 'buyers_agent' | 'building_inspection' | 'other';
    description: string;
    amount: string; // Stored as string for Decimal.js compatibility in IndexedDB
    date: Date;
}

export interface PropertyIncome {
    id?: number;
    profileId?: string;
    propertyId: number;
    financialYear: FinancialYear;
    grossRent: string;
    insurancePayouts: string;
    otherIncome: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PropertyExpense {
    id?: number;
    profileId?: string;
    propertyId: number;
    financialYear: FinancialYear;
    category: PropertyExpenseCategory;
    amount: string;
    description: string;
    isCapitalImprovement: boolean;
    contractor?: string;
    date: Date;
    // Recurrence details
    recurrenceAmount?: string; // e.g. "50.00"
    recurrenceFrequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
    recurrenceCount?: number; // e.g. 12
    createdAt: Date;
}

export type PropertyExpenseCategory =
    | 'advertising'
    | 'body_corporate'
    | 'borrowing_expenses'
    | 'cleaning'
    | 'council_rates'
    | 'gardening'
    | 'insurance'
    | 'interest'
    | 'land_tax'
    | 'legal_fees'
    | 'pest_control'
    | 'property_agent'
    | 'repairs'
    | 'stationery'
    | 'travel'
    | 'water'
    | 'capital_improvement'
    | 'other';

export interface PropertyLoan {
    id?: number;
    profileId?: string;
    propertyId: number;
    financialYear: FinancialYear;
    lender: string;
    accountNumber?: string;
    loanStartDate: Date;
    originalPrincipal: string;
    currentBalance: string;
    interestRatePAPercent: string;
    repaymentType: 'interest_only' | 'principal_and_interest';
    annualInterestPaid: string; // Deductible amount for the FY
    createdAt: Date;
    updatedAt: Date;
}

// ==================== Work Deductions ====================

export interface WorkDeductions {
    id?: number;
    profileId?: string;
    financialYear: FinancialYear;
    wfhMethod: 'fixed_rate' | 'actual_cost';
    totalHoursWorked: number;
    actualCosts: ActualCosts;
    createdAt: Date;
    updatedAt: Date;
}

export interface ActualCosts {
    electricity: string;
    internet: string;
    cleaning: string;
    phoneUsage: string;
    stationery: string;
}

export interface DepreciableAsset {
    id?: number;
    profileId?: string;
    financialYear: FinancialYear;
    itemName: string;
    purchaseDate: Date;
    cost: string;
    effectiveLifeYears: number;
    method: 'diminishing_value' | 'prime_cost';
    workUsePercentage: number; // 0-100
    createdAt: Date;
}

// ==================== Crypto & Capital Gains ====================

export interface CryptoTransaction {
    id?: number;
    profileId?: string;
    financialYear: FinancialYear;
    type: 'buy' | 'sell' | 'initial_balance';
    assetName: string;
    date: Date;
    price: string; // Total cost/proceeds
    quantity: string;
    fees: string;
    exchange?: string;
    notes?: string;
    createdAt: Date;
}

export interface CapitalGainCalculation {
    assetName: string;
    costBase: Decimal;
    salePrice: Decimal;
    grossGain: Decimal;
    holdingPeriodDays: number;
    discountApplied: boolean;
    taxableGain: Decimal;
}

// ==================== Receipts ====================

export interface Receipt {
    id?: number;
    profileId: string; // Links to UserProfile.profileId
    financialYear: FinancialYear;
    date: Date;
    vendor: string;
    amount: string;
    category: ExpenseCategory;
    description: string;
    attachmentBlob?: Blob;
    attachmentName?: string;
    attachmentType?: string;
    isGreyArea: boolean;
    linkedPropertyId?: number;
    linkedAssetId?: number;
    createdAt: Date;
}

export type ExpenseCategory =
    | 'work_clothing'
    | 'tools_equipment'
    | 'self_education'
    | 'travel'
    | 'phone_internet'
    | 'union_fees'
    | 'professional_subscriptions'
    | 'car_expenses'
    | 'home_office'
    | 'other';

// ==================== Tax Settings ====================

export interface TaxSettings {
    id?: number;
    financialYear: FinancialYear;
    taxBrackets: TaxBracket[];
    wfhFixedRate: string; // $ per hour
    vehicleCentsPerKm: string;
    mealAllowance: string;
    lowValuePoolThreshold: string;
    instantAssetWriteOffThreshold: string;
    hasPrivateHealthInsurance?: boolean; // Exempt from Medicare levy if true
    createdAt: Date;
    updatedAt: Date;
}

export interface TaxBracket {
    minIncome: number;
    maxIncome: number | null; // null = no upper limit
    rate: number; // percentage (e.g., 32.5)
    baseTax: number; // fixed amount for lower brackets
}

// ==================== Settings ====================

export interface AppSettings {
    id?: number;
    key: string;
    value: string;
}

// ==================== Dashboard Types ====================

export interface SafetyCheckItem {
    category: string;
    userAmount: Decimal;
    atoAverage: Decimal;
    status: 'safe' | 'warning' | 'danger';
    message: string;
}

export interface ActivityItem {
    id: string;
    date: Date;
    type: 'expense' | 'income' | 'deduction' | 'transfer';
    description: string;
    category: string;
    amount: Decimal;
}

// ==================== Navigation ====================

export interface NavigationItem {
    id: string;
    label: string;
    icon: string;
    path: string;
}

// ==================== Accountant Notes ====================

export interface AccountantNote {
    id?: number;
    profileId?: string;
    financialYear: FinancialYear;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    isResolved: boolean;
    createdAt: Date;
    updatedAt: Date;
}

