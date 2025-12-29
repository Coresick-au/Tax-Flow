import { create } from 'zustand';
import Decimal from 'decimal.js';
import { db } from '../database/db';
import { seedTaxSettings, getOrCreateTaxSettings } from '../database/seed';
import { calculateSafetyCheck, mapReceiptCategoryToAtoCategory } from '../utils/safetyCheck';
import type { UserProfile, TaxSettings, SafetyCheckItem, ActivityItem } from '../types';

interface TaxFlowState {
    // App state
    isInitialized: boolean;
    isLoading: boolean;

    // Financial year
    currentFinancialYear: string;
    availableFinancialYears: string[];

    // User profile
    userProfile: UserProfile | null;

    // Tax settings for current year
    taxSettings: TaxSettings | null;

    // Calculated values
    estimatedTaxableIncome: Decimal;
    estimatedTaxPayable: Decimal;
    totalDeductions: Decimal;
    deductionCount: number;

    // Safety check
    safetyCheckItems: SafetyCheckItem[];
    auditRiskLevel: 'low' | 'medium' | 'high';

    // Recent activity
    recentActivity: ActivityItem[];

    // Actions
    initialize: () => Promise<void>;
    setFinancialYear: (year: string) => Promise<void>;
    setUserProfile: (profile: UserProfile) => void;
    setTaxSettings: (settings: TaxSettings) => Promise<void>;
    calculateTaxPosition: () => Promise<void>;
    calculateSafetyCheck: () => Promise<void>;
    refreshDashboard: () => Promise<void>;
}

// Get current Australian financial year (July 1 - June 30)
function getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // If before July, we're in the previous FY
    if (month < 6) {
        return `${year - 1}-${year}`;
    }
    return `${year}-${year + 1}`;
}

// Generate list of available financial years (current + 2 previous)
function getAvailableFinancialYears(): string[] {
    const current = getCurrentFinancialYear();
    const [startYear] = current.split('-').map(Number);

    return [
        `${startYear - 2}-${startYear - 1}`,
        `${startYear - 1}-${startYear}`,
        current,
    ];
}

export const useTaxFlowStore = create<TaxFlowState>((set, get) => ({
    // Initial state
    isInitialized: false,
    isLoading: false,
    currentFinancialYear: getCurrentFinancialYear(),
    availableFinancialYears: getAvailableFinancialYears(),
    userProfile: null,
    taxSettings: null,
    estimatedTaxableIncome: new Decimal(0),
    estimatedTaxPayable: new Decimal(0),
    totalDeductions: new Decimal(0),
    deductionCount: 0,
    safetyCheckItems: [],
    auditRiskLevel: 'low',
    recentActivity: [],

    // Initialize the store
    initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });

        try {
            // Seed tax settings if needed
            await seedTaxSettings();

            // Load tax settings for current year
            const taxSettings = await getOrCreateTaxSettings(get().currentFinancialYear);

            // Load user profile for current year
            const userProfile = await db.userProfile
                .where('financialYear')
                .equals(get().currentFinancialYear)
                .first();

            set({
                taxSettings,
                userProfile: userProfile || null,
                isInitialized: true,
                isLoading: false,
            });

            // Calculate initial tax position
            await get().calculateTaxPosition();
        } catch (error) {
            console.error('Failed to initialize TaxFlow:', error);
            set({ isLoading: false });
        }
    },

    // Switch financial year
    setFinancialYear: async (year: string) => {
        set({ isLoading: true, currentFinancialYear: year });

        try {
            const taxSettings = await getOrCreateTaxSettings(year);
            const userProfile = await db.userProfile
                .where('financialYear')
                .equals(year)
                .first();

            set({
                taxSettings,
                userProfile: userProfile || null,
                isLoading: false,
            });

            await get().calculateTaxPosition();
        } catch (error) {
            console.error('Failed to switch financial year:', error);
            set({ isLoading: false });
        }
    },

    // Update user profile
    setUserProfile: (profile: UserProfile) => {
        set({ userProfile: profile });
    },

    // Update tax settings
    setTaxSettings: async (settings: TaxSettings) => {
        try {
            // Update in database
            if (settings.id) {
                await db.taxSettings.update(settings.id, {
                    ...settings,
                    updatedAt: new Date(),
                });
            } else {
                const id = await db.taxSettings.add({
                    ...settings,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                settings.id = id;
            }

            // Update store
            set({ taxSettings: settings });

            // Recalculate tax position with new settings
            await get().calculateTaxPosition();
        } catch (error) {
            console.error('Failed to save tax settings:', error);
        }
    },

    // Calculate tax position
    calculateTaxPosition: async () => {
        const { currentFinancialYear, taxSettings } = get();

        if (!taxSettings) return;

        try {
            // Sum all property income
            const propertyIncomes = await db.propertyIncome
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            let totalIncome = new Decimal(0);
            for (const income of propertyIncomes) {
                totalIncome = totalIncome
                    .add(income.grossRent || '0')
                    .add(income.insurancePayouts || '0')
                    .add(income.otherIncome || '0');
            }

            // Sum general income (salary, dividends, etc)
            const generalIncomes = await db.income
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            for (const item of generalIncomes) {
                totalIncome = totalIncome.add(item.amount || '0');
            }

            // Sum all deductions
            const propertyExpenses = await db.propertyExpenses
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(e => !e.isCapitalImprovement)
                .toArray();

            const receipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            let totalDeductions = new Decimal(0);
            for (const expense of propertyExpenses) {
                totalDeductions = totalDeductions.add(expense.amount || '0');
            }
            for (const receipt of receipts) {
                totalDeductions = totalDeductions.add(receipt.amount || '0');
            }

            const deductionCount = propertyExpenses.length + receipts.length;

            // Calculate taxable income
            const taxableIncome = Decimal.max(totalIncome.sub(totalDeductions), new Decimal(0));

            // Calculate tax payable using brackets
            let taxPayable = new Decimal(0);
            const income = taxableIncome.toNumber();

            for (const bracket of taxSettings.taxBrackets) {
                if (income >= bracket.minIncome) {
                    if (bracket.maxIncome === null || income <= bracket.maxIncome) {
                        // This is the applicable bracket
                        const taxableInBracket = income - bracket.minIncome + 1;
                        taxPayable = new Decimal(bracket.baseTax).add(
                            new Decimal(taxableInBracket).mul(bracket.rate).div(100)
                        );
                        break;
                    }
                }
            }

            set({
                estimatedTaxableIncome: taxableIncome,
                estimatedTaxPayable: taxPayable,
                totalDeductions,
                deductionCount,
            });
        } catch (error) {
            console.error('Failed to calculate tax position:', error);
        }
    },

    // Calculate safety check against ATO averages
    calculateSafetyCheck: async () => {
        const { currentFinancialYear, userProfile } = get();

        try {
            // Get all receipts and categorize by type
            const receipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            // Aggregate deductions by category
            const deductionsByCategory: Record<string, Decimal> = {};

            for (const receipt of receipts) {
                // Map receipt categories to ATO categories
                const atoCategory = mapReceiptCategoryToAtoCategory(receipt.category);
                if (!deductionsByCategory[atoCategory]) {
                    deductionsByCategory[atoCategory] = new Decimal(0);
                }
                deductionsByCategory[atoCategory] = deductionsByCategory[atoCategory].add(receipt.amount || '0');
            }

            // Get occupation code from user profile (default to 'default')
            const occupationCode = userProfile?.occupationCode || 'default';

            // Calculate safety check
            const result = calculateSafetyCheck(deductionsByCategory, occupationCode);

            set({
                safetyCheckItems: result.items,
                auditRiskLevel: result.overallRisk,
            });
        } catch (error) {
            console.error('Failed to calculate safety check:', error);
        }
    },

    // Refresh dashboard data
    refreshDashboard: async () => {
        const { currentFinancialYear } = get();

        try {
            // Get recent activity (last 10 items)
            const recentReceipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .reverse()
                .limit(10)
                .toArray();

            const recentActivity: ActivityItem[] = recentReceipts.map(r => ({
                id: String(r.id),
                date: r.date,
                type: 'expense' as const,
                description: r.vendor,
                category: r.category,
                amount: new Decimal(r.amount),
            }));

            set({ recentActivity });

            // Recalculate tax position and safety check
            await get().calculateTaxPosition();
            await get().calculateSafetyCheck();
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
        }
    },
}));
