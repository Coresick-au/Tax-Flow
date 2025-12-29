import Dexie, { type Table } from 'dexie';
import type {
    UserProfile,
    Property,
    PropertyIncome,
    PropertyExpense,
    WorkDeductions,
    DepreciableAsset,
    CryptoTransaction,
    Receipt,
    TaxSettings,
    AppSettings,
    IncomeRecord,
} from '../types';

export class TaxFlowDatabase extends Dexie {
    userProfile!: Table<UserProfile>;
    properties!: Table<Property>;
    propertyIncome!: Table<PropertyIncome>;
    propertyExpenses!: Table<PropertyExpense>;
    workDeductions!: Table<WorkDeductions>;
    depreciableAssets!: Table<DepreciableAsset>;
    cryptoTransactions!: Table<CryptoTransaction>;
    receipts!: Table<Receipt>;
    taxSettings!: Table<TaxSettings>;
    settings!: Table<AppSettings>;
    income!: Table<IncomeRecord>;

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
    const data = JSON.parse(jsonData) as Record<string, unknown[]>;

    await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
            if (data[table.name]) {
                await table.clear();
                await table.bulkAdd(data[table.name] as object[]);
            }
        }
    });
}
