import Dexie, { type Table } from 'dexie';
import type {
    UserProfile,
    Property,
    PropertyIncome,
    PropertyExpense,
    PropertyLoan,
    WorkDeductions,
    DepreciableAsset,
    CryptoTransaction,
    Receipt,
    TaxSettings,
    AppSettings,
    IncomeRecord,
    AccountantNote,
} from '../types';

export class TaxFlowDatabase extends Dexie {
    userProfile!: Table<UserProfile>;
    properties!: Table<Property>;
    propertyIncome!: Table<PropertyIncome>;
    propertyExpenses!: Table<PropertyExpense>;
    propertyLoans!: Table<PropertyLoan>;
    workDeductions!: Table<WorkDeductions>;
    depreciableAssets!: Table<DepreciableAsset>;
    cryptoTransactions!: Table<CryptoTransaction>;
    receipts!: Table<Receipt>;
    taxSettings!: Table<TaxSettings>;
    settings!: Table<AppSettings>;
    income!: Table<IncomeRecord>;
    accountantNotes!: Table<AccountantNote>;

    constructor() {
        super('TaxFlowDB');

        this.version(1).stores({
            userProfile: '++id, financialYear, taxResidency',
            properties: '++id, financialYear, address, status',
            propertyIncome: '++id, propertyId, financialYear',
            propertyExpenses: '++id, propertyId, financialYear, category, date',
            workDeductions: '++id, financialYear',
            depreciableAssets: '++id, financialYear, itemName',
            cryptoTransactions: '++id, financialYear, date, assetName, type',
            receipts: '++id, financialYear, date, category, amount',
            taxSettings: '++id, financialYear',
            settings: '++id, key',
        });

        this.version(2).stores({
            income: '++id, financialYear, date, category'
        });

        // Version 3: Add profileId for multi-user support
        this.version(3).stores({
            userProfile: '++id, profileId, financialYear, taxResidency',
            income: '++id, profileId, financialYear, date, category',
            receipts: '++id, profileId, financialYear, date, category, amount'
        });

        // Version 4: Add property loans table
        this.version(4).stores({
            propertyLoans: '++id, propertyId, financialYear, lender'
        });

        // Version 5: Add accountant notes table
        this.version(5).stores({
            accountantNotes: '++id, profileId, financialYear, priority, isResolved'
        });

        // Version 6: Properties are now global (no financialYear), indexed by status/purchaseDate
        this.version(6).stores({
            properties: '++id, address, status, purchaseDate'
        });

        // Version 7: Full profile isolation for all financial tables
        this.version(7).stores({
            userProfile: '++id, profileId, financialYear, taxResidency',
            properties: '++id, profileId, address, status, purchaseDate',
            propertyIncome: '++id, profileId, propertyId, financialYear',
            propertyExpenses: '++id, profileId, propertyId, financialYear, category, date',
            propertyLoans: '++id, profileId, propertyId, financialYear, lender',
            workDeductions: '++id, profileId, financialYear',
            depreciableAssets: '++id, profileId, financialYear, itemName',
            cryptoTransactions: '++id, profileId, financialYear, date, assetName, type',
            receipts: '++id, profileId, financialYear, date, category, amount',
            taxSettings: '++id, financialYear',
            settings: '++id, key',
            income: '++id, profileId, financialYear, date, category',
            accountantNotes: '++id, profileId, financialYear, priority, isResolved'
        });
    }
}

// Singleton database instance
export const db = new TaxFlowDatabase();

// Database utility functions
export async function clearAllData(): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
            await table.clear();
        }
    });
}

export async function exportDatabase(): Promise<string> {
    const data: Record<string, unknown[]> = {};

    for (const table of db.tables) {
        data[table.name] = await table.toArray();
    }

    return JSON.stringify(data, null, 2);
}

export async function importDatabase(jsonData: string): Promise<void> {
    try {
        const data = JSON.parse(jsonData) as Record<string, any[]>;

        // Find a default profile ID from the imported data to assign to legacy records
        let defaultProfileId: string | undefined;
        if (data.userProfile?.length > 0) {
            defaultProfileId = data.userProfile[0].profileId;
        }

        await db.transaction('rw', db.tables, async () => {
            // First clear all tables
            for (const table of db.tables) {
                await table.clear();
            }

            // Then import data
            for (const table of db.tables) {
                if (data[table.name]) {
                    const records = data[table.name];

                    // If we have a default profile, inject it into legacy records that need it
                    // Skip 'settings' and 'taxSettings' as they might be global or different
                    if (defaultProfileId &&
                        table.name !== 'userProfile' &&
                        table.name !== 'settings' &&
                        table.name !== 'taxSettings') {

                        records.forEach(record => {
                            if (record && typeof record === 'object' && !record.profileId) {
                                record.profileId = defaultProfileId;
                            }
                        });
                    }

                    await table.bulkAdd(records);
                }
            }
        });
    } catch (error) {
        console.error("Failed to import database:", error);
        throw error;
    }
}
