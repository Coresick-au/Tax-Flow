import type { TaxSettings, TaxBracket } from '../types';
import { db } from './db';

// 2024-2025 ATO Tax Brackets (Resident)
const TAX_BRACKETS_2024_25: TaxBracket[] = [
    { minIncome: 0, maxIncome: 18200, rate: 0, baseTax: 0 },
    { minIncome: 18201, maxIncome: 45000, rate: 16, baseTax: 0 },
    { minIncome: 45001, maxIncome: 135000, rate: 30, baseTax: 4288 },
    { minIncome: 135001, maxIncome: 190000, rate: 37, baseTax: 31288 },
    { minIncome: 190001, maxIncome: null, rate: 45, baseTax: 51638 },
];

const DEFAULT_TAX_SETTINGS_2024_25: Omit<TaxSettings, 'id'> = {
    financialYear: '2024-2025',
    taxBrackets: TAX_BRACKETS_2024_25,
    wfhFixedRate: '0.67', // ATO fixed rate per hour
    vehicleCentsPerKm: '0.88', // 88 cents per km for 2024-25
    mealAllowance: '36.40', // Reasonable overtime meal allowance
    lowValuePoolThreshold: '1000',
    instantAssetWriteOffThreshold: '20000', // Small business instant asset write-off
    createdAt: new Date(),
    updatedAt: new Date(),
};

export async function seedTaxSettings(): Promise<void> {
    const existingSettings = await db.taxSettings
        .where('financialYear')
        .equals('2024-2025')
        .first();

    if (!existingSettings) {
        await db.taxSettings.add(DEFAULT_TAX_SETTINGS_2024_25);
    }
}

export async function getTaxSettingsForYear(
    financialYear: string
): Promise<TaxSettings | undefined> {
    return db.taxSettings.where('financialYear').equals(financialYear).first();
}

export async function getOrCreateTaxSettings(
    financialYear: string
): Promise<TaxSettings> {
    let settings = await getTaxSettingsForYear(financialYear);

    if (!settings) {
        // Clone from most recent year or use defaults
        const mostRecent = await db.taxSettings.orderBy('financialYear').last();

        if (mostRecent) {
            const newSettings: Omit<TaxSettings, 'id'> = {
                ...mostRecent,
                financialYear,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            delete (newSettings as Partial<TaxSettings>).id;
            await db.taxSettings.add(newSettings);
            settings = await getTaxSettingsForYear(financialYear);
        } else {
            await db.taxSettings.add({
                ...DEFAULT_TAX_SETTINGS_2024_25,
                financialYear,
            });
            settings = await getTaxSettingsForYear(financialYear);
        }
    }

    return settings!;
}
