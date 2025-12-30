import { create } from 'zustand';
import Decimal from 'decimal.js';
import { db } from '../database/db';
import { seedTaxSettings, getOrCreateTaxSettings } from '../database/seed';
import { calculateSafetyCheck, mapReceiptCategoryToAtoCategory } from '../utils/safetyCheck';
import { calculateWorkDeduction, calculateDepreciation, calculateCapitalGains } from '../utils/taxCalculators';
import type { UserProfile, TaxSettings, SafetyCheckItem, ActivityItem } from '../types';

interface TaxFlowState {
    // App state
    isInitialized: boolean;
    isLoading: boolean;

    // Profile management
    currentProfileId: string | null;
    availableProfiles: UserProfile[];

    // Financial year
    currentFinancialYear: string;
    availableFinancialYears: string[];

    // User profile (current)
    userProfile: UserProfile | null;

    // Tax settings for current year
    taxSettings: TaxSettings | null;

    // Calculated values
    estimatedTaxableIncome: Decimal;
    estimatedTaxPayable: Decimal;
    totalDeductions: Decimal;
    deductionCount: number;
    hasFractionalOwnership: boolean;

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

    // Profile management actions
    createProfile: (name: string, occupation?: string) => Promise<UserProfile>;
    setCurrentProfile: (profileId: string) => Promise<void>;
    loadProfiles: () => Promise<void>;
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

// Helper to check if property was owned during a specific FY
function isPropertyActiveInFY(property: { purchaseDate: Date; saleDate?: Date }, fy: string): boolean {
    const [startYearStr] = fy.split('-');
    const startYear = parseInt(startYearStr, 10);

    const fyStart = new Date(startYear, 6, 1);       // July 1st of start year
    const fyEnd = new Date(startYear + 1, 5, 30);    // June 30th of end year

    const purchaseDate = new Date(property.purchaseDate);



    // Exclude properties purchased after this FY ended
    if (purchaseDate > fyEnd) return false;

    // If sold, check if it was sold before this FY started
    if (property.saleDate) {
        const saleDate = new Date(property.saleDate);
        if (saleDate < fyStart) return false;
    }

    // Property was owned before or at FY start and not sold before FY
    return true;
}

export const useTaxFlowStore = create<TaxFlowState>((set, get) => ({
    // Initial state
    isInitialized: false,
    isLoading: false,
    currentProfileId: null,
    availableProfiles: [],
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
    hasFractionalOwnership: false,

    // Initialize the store
    initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });

        try {
            // Seed tax settings if needed
            await seedTaxSettings();

            // Load tax settings for current year
            const taxSettings = await getOrCreateTaxSettings(get().currentFinancialYear);

            // Load all profiles
            let profiles = await db.userProfile.toArray();

            // If no profiles exist, check if we have legacy data
            if (profiles.length === 0) {
                const hasData = (await db.properties.count()) > 0 ||
                    (await db.income.count()) > 0 ||
                    (await db.receipts.count()) > 0;

                if (hasData) {
                    // Create a default profile for legacy data
                    const defaultProfile: UserProfile = {
                        profileId: crypto.randomUUID(),
                        name: 'Main Account',
                        occupation: 'User',
                        financialYear: get().currentFinancialYear,
                        taxResidency: 'resident',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    await db.userProfile.add(defaultProfile);
                    profiles = [defaultProfile];

                    // Optional: We could migrate all existing data here, 
                    // but lenient filtering handles it for now.
                }
            }

            const uniqueProfiles = profiles.reduce((acc, profile) => {
                if (!acc.find(p => p.profileId === profile.profileId)) {
                    acc.push(profile);
                }
                return acc;
            }, [] as UserProfile[]);

            // Auto-select first profile if exists and none selected
            let currentProfileId = get().currentProfileId;
            let userProfile = null;

            if (uniqueProfiles.length > 0 && !currentProfileId) {
                currentProfileId = uniqueProfiles[0].profileId;
                userProfile = uniqueProfiles[0];
            } else if (currentProfileId) {
                const found = uniqueProfiles.find(p => p.profileId === currentProfileId);
                if (found) {
                    userProfile = found;
                } else if (uniqueProfiles.length > 0) {
                    // Current ID invalid/deleted, fallback to first
                    currentProfileId = uniqueProfiles[0].profileId;
                    userProfile = uniqueProfiles[0];
                }
            }

            set({
                taxSettings,
                availableProfiles: uniqueProfiles,
                currentProfileId,
                userProfile,
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
        const { currentFinancialYear, taxSettings, currentProfileId } = get();

        if (!taxSettings) return;

        try {
            // Fetch properties for current profile and filter for those active in current FY
            // Note: In transition, allow properties with no profileId
            const allPropertiesRaw = await db.properties.toArray();
            const properties = allPropertiesRaw.filter(p =>
                (!p.profileId || p.profileId === currentProfileId) &&
                isPropertyActiveInFY(p, currentFinancialYear)
            );

            // Create a map of propertyId -> ownership percentage
            const ownershipMap = new Map<number, number>();
            for (const prop of properties) {
                const percentage = prop.ownershipSplit?.[0]?.percentage ?? 100;
                if (prop.id) {
                    ownershipMap.set(prop.id, percentage / 100); // Convert to decimal
                }
            }

            const hasFractionalOwnership = Array.from(ownershipMap.values()).some(fraction => fraction < 1);

            // Sum all property income (applying ownership split)
            const propertyIncomes = await db.propertyIncome
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(i => !i.profileId || i.profileId === currentProfileId)
                .toArray();

            // Filter by profile? Properties are generally shared, but income might need to be specific?
            // For now, let's assume property income is tied to property ownership which is handled by ownershipMap
            // If we need strict profile isolation for property income entries themselves, we'd need to add profileId to PropertyIncome table.
            // Based on current db schema, PropertyIncome doesn't have profileId yet (it seems), or it does?
            // Checking db.ts... version 3 added profileId to income and receipts. 
            // PropertyIncome might not have it. Let's check the schema again.
            // Schema: propertyIncome: '++id, propertyId, financialYear' -> No profileId.
            // So property income is global for the property.
            // Ownership map handles the split.


            let totalIncome = new Decimal(0);
            for (const income of propertyIncomes) {
                // IMPORTANT: Default to 0 if property not found (e.g. deleted but income record remains)
                // This prevents ghost income from showing up on the dashboard.
                const ownershipFraction = ownershipMap.get(income.propertyId) ?? 0;
                const propertyTotal = new Decimal(income.grossRent || '0')
                    .add(income.insurancePayouts || '0')
                    .add(income.otherIncome || '0');
                totalIncome = totalIncome.add(propertyTotal.mul(ownershipFraction));
            }

            // Sum general income (salary, dividends, etc)
            const allIncome = await db.income
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(record => !record.profileId || record.profileId === currentProfileId)
                .toArray();

            for (const item of allIncome) {
                totalIncome = totalIncome.add(item.amount || '0');
            }

            // Add Crypto Gains to Income
            const cryptoTransactions = await db.cryptoTransactions
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(tx => !tx.profileId || tx.profileId === currentProfileId)
                .toArray();

            const cryptoGain = calculateCapitalGains(cryptoTransactions);
            totalIncome = totalIncome.add(cryptoGain);


            // Checking db.ts: cryptoTransactions: '++id, financialYear, date, assetName, type' -> No profileId.
            // Assuming crypto is shared or not yet multi-user enabled. 
            // We will leave it as is for now, or filter if we added it (we haven't in db.ts viewing).


            // Sum all deductions
            const propertyExpenses = await db.propertyExpenses
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(e => !e.isCapitalImprovement && (!e.profileId || e.profileId === currentProfileId))
                .toArray();

            const receipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(r => !r.profileId || r.profileId === currentProfileId)
                .toArray();

            // Fetch WFH deductions
            const workDeductions = await db.workDeductions
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(d => !d.profileId || d.profileId === currentProfileId)
                .toArray();

            // Fetch Depreciable Assets
            const depreciableAssets = await db.depreciableAssets
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(a => !a.profileId || a.profileId === currentProfileId)
                .toArray();

            let totalDeductions = new Decimal(0);
            for (const expense of propertyExpenses) {
                const ownershipFraction = ownershipMap.get(expense.propertyId) ?? 0;
                totalDeductions = totalDeductions.add(new Decimal(expense.amount || '0').mul(ownershipFraction));
            }
            for (const receipt of receipts) {
                totalDeductions = totalDeductions.add(receipt.amount || '0');
            }

            // Calculate WFH deduction
            const wfhRecord = workDeductions[0]; // Just take first for now
            if (wfhRecord) {
                const wfhDeduction = calculateWorkDeduction(wfhRecord);
                totalDeductions = totalDeductions.add(wfhDeduction);
            }

            // Calculate Asset Depreciation
            // Determine FY end date
            const endYearStr = currentFinancialYear.split('-')[1];
            const endYear = parseInt(endYearStr);
            const fyEnd = new Date(endYear, 5, 30); // June 30

            for (const asset of depreciableAssets) {
                const depreciation = calculateDepreciation(asset, fyEnd);
                totalDeductions = totalDeductions.add(depreciation);
            }

            const deductionCount = propertyExpenses.length + receipts.length + (wfhRecord ? 1 : 0) + depreciableAssets.length;

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
                hasFractionalOwnership,
            });
        } catch (error) {
            console.error('Failed to calculate tax position:', error);
        }
    },

    // Calculate safety check against ATO averages
    calculateSafetyCheck: async () => {
        const { currentFinancialYear, userProfile, currentProfileId } = get();

        try {
            // Get all receipts and categorize by type
            const receipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(r => !r.profileId || r.profileId === currentProfileId)
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
        const { currentFinancialYear, currentProfileId } = get();

        try {
            // Get recent activity (last 10 items)
            const recentReceipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(r => r.profileId === currentProfileId)
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

    // Load all available profiles
    loadProfiles: async () => {
        try {
            const profiles = await db.userProfile.toArray();
            // Get unique profiles by profileId
            const uniqueProfiles = profiles.reduce((acc, profile) => {
                if (!acc.find(p => p.profileId === profile.profileId)) {
                    acc.push(profile);
                }
                return acc;
            }, [] as UserProfile[]);

            set({ availableProfiles: uniqueProfiles });
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    },

    // Create a new profile
    createProfile: async (name: string, occupation: string = 'Not specified') => {
        const profileId = crypto.randomUUID();
        const now = new Date();
        const { currentFinancialYear } = get();

        const newProfile: UserProfile = {
            profileId,
            financialYear: currentFinancialYear,
            taxResidency: 'resident',
            name,
            occupation,
            createdAt: now,
            updatedAt: now,
        };

        await db.userProfile.add(newProfile);

        // Reload profiles and switch to the new one
        await get().loadProfiles();
        await get().setCurrentProfile(profileId);

        return newProfile;
    },

    // Switch to a different profile
    setCurrentProfile: async (profileId: string) => {
        set({ isLoading: true, currentProfileId: profileId });

        try {
            // Find the profile by profileId
            const profile = await db.userProfile
                .where('profileId')
                .equals(profileId)
                .first();

            set({
                userProfile: profile || null,
                currentProfileId: profileId,
                isLoading: false,
            });

            // Refresh data for this profile
            await get().refreshDashboard();
        } catch (error) {
            console.error('Failed to switch profile:', error);
            set({ isLoading: false });
        }
    },
}));
