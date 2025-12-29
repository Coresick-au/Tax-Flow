# Design Document: TaxFlow Australia

## Overview

TaxFlow Australia is a local-first React application built with TypeScript and Vite that provides comprehensive Australian tax management capabilities. The system uses IndexedDB for data persistence, enabling offline functionality while supporting receipt attachments and cross-device synchronization through encrypted backup files.

The application follows a dark mode design system with high contrast and data-dense layouts optimized for both desktop and mobile use. All tax calculations are performed client-side using decimal.js to ensure precision in financial computations.

## Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand for global state
- **Database**: Dexie.js (IndexedDB wrapper) for local persistence
- **Math Library**: decimal.js for precise financial calculations
- **Styling**: Tailwind CSS with custom dark theme
- **PWA**: Service Worker for offline capability and desktop installation
- **PWA Tools**: Vite PWA plugin for manifest generation and service worker

### Application Structure
```
src/
├── components/           # Reusable UI components
├── pages/               # Main application pages
├── stores/              # Zustand state stores
├── database/            # Dexie schema and operations
├── utils/               # Tax calculation utilities
├── types/               # TypeScript type definitions
└── theme/               # Design system tokens
```

### Data Flow Architecture
1. **User Input** → React Components
2. **State Updates** → Zustand Stores
3. **Data Persistence** → Dexie.js → IndexedDB
4. **Calculations** → Utility Functions (decimal.js)
5. **UI Updates** → React Re-renders

## Components and Interfaces

### Core Components

#### Dashboard Layout
```typescript
interface DashboardProps {
  financialYear: string;
  estimatedTaxableIncome: Decimal;
  estimatedTaxPayable: Decimal;
  safetyCheckItems: SafetyCheckItem[];
  recentActivity: ActivityItem[];
}
```

#### Sidebar Navigation
```typescript
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  isActive: boolean;
}
```

#### Property Management
```typescript
interface Property {
  id: string;
  address: string;
  ownershipSplit: Record<string, number>;
  purchaseDate: Date;
  firstRentedDate: Date;
  costBase: CostBaseItem[];
  annualIncome: PropertyIncome;
  annualExpenses: PropertyExpense[];
  depreciationSchedule: DepreciationData;
}

interface PropertyExpense {
  category: ExpenseCategory;
  amount: Decimal;
  description: string;
  isCapitalImprovement: boolean;
  date: Date;
}
```

#### Work Deductions System
```typescript
interface WorkDeductions {
  wfhMethod: 'fixed_rate' | 'actual_cost';
  totalHoursWorked: number;
  actualCosts: {
    electricity: Decimal;
    internet: Decimal;
    cleaning: Decimal;
  };
  assetRegister: DepreciableAsset[];
}

interface DepreciableAsset {
  itemName: string;
  purchaseDate: Date;
  cost: Decimal;
  effectiveLifeYears: number;
  method: 'diminishing_value' | 'prime_cost';
  deductionThisYear: Decimal;
}
```

#### Crypto & Capital Gains
```typescript
interface CryptoTransaction {
  id: string;
  type: 'buy' | 'sell';
  assetName: string;
  date: Date;
  price: Decimal;
  quantity: Decimal;
  fees: Decimal;
}

interface CapitalGain {
  assetName: string;
  costBase: Decimal;
  salePrice: Decimal;
  netGain: Decimal;
  discountApplied: boolean;
  taxableGain: Decimal;
}
```

#### Receipt Management
```typescript
interface Receipt {
  id: string;
  date: Date;
  vendor: string;
  amount: Decimal;
  category: ExpenseCategory;
  description: string;
  attachments: File[];
  isGreyArea: boolean;
}
```

#### PWA Installation
```typescript
interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  showInstallButton: boolean;
}

interface InstallationGuide {
  platform: 'chrome' | 'safari' | 'android';
  steps: InstallStep[];
  images: string[];
}
```

## Data Models

### Database Schema (Dexie.js)

```typescript
class TaxFlowDatabase extends Dexie {
  userProfile!: Table<UserProfile>;
  properties!: Table<Property>;
  workDeductions!: Table<WorkDeductions>;
  cryptoTransactions!: Table<CryptoTransaction>;
  receipts!: Table<Receipt>;
  settings!: Table<Settings>;
  taxSettings!: Table<TaxSettings>;

  constructor() {
    super('TaxFlowDB');
    this.version(1).stores({
      userProfile: '++id, financialYear, taxResidency',
      properties: '++id, address, financialYear',
      workDeductions: '++id, financialYear',
      cryptoTransactions: '++id, date, assetName, type',
      receipts: '++id, date, category, amount',
      settings: '++id, key, value',
      taxSettings: '++id, financialYear'
    });
  }
}
```

### PWA Configuration

```typescript
// manifest.json
interface PWAManifest {
  name: "TaxFlow Australia";
  short_name: "TaxFlow AU";
  description: "Australian Tax Management Application";
  start_url: "/";
  display: "standalone";
  background_color: "#101922";
  theme_color: "#2b8cee";
  icons: [
    {
      src: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png"
    }
  ];
}

// Service Worker Strategy
const SW_STRATEGIES = {
  // Cache app shell for offline use
  appShell: 'CacheFirst',
  // Cache API responses with network fallback
  apiData: 'NetworkFirst',
  // Cache static assets
  staticAssets: 'StaleWhileRevalidate'
};
```

### State Management (Zustand)

```typescript
interface TaxFlowState {
  // Current financial year
  currentFinancialYear: string;
  
  // User profile
  userProfile: UserProfile;
  
  // Tax calculations
  estimatedTaxableIncome: Decimal;
  estimatedTaxPayable: Decimal;
  
  // Actions
  setFinancialYear: (year: string) => void;
  calculateTaxPosition: () => void;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
}
```

## Tax Calculation Logic

### Work From Home Calculator
Based on ATO research, the current rates are:
- **Fixed Rate Method**: $0.67 per hour (2024-25 rate)
- **Actual Cost Method**: Sum of electricity + internet + furniture depreciation portions

```typescript
function calculateWFHDeduction(
  method: 'fixed_rate' | 'actual_cost',
  hoursWorked: number,
  actualCosts?: ActualCosts
): Decimal {
  if (method === 'fixed_rate') {
    return new Decimal(hoursWorked).mul(0.67);
  }
  
  if (actualCosts) {
    return actualCosts.electricity
      .add(actualCosts.internet)
      .add(actualCosts.cleaning);
  }
  
  return new Decimal(0);
}
```

### Depreciation Engine
Implements diminishing value method for assets over $300:

```typescript
function calculateDepreciation(
  cost: Decimal,
  effectiveLifeYears: number,
  daysHeld: number
): Decimal {
  const rate = new Decimal(200).div(effectiveLifeYears).div(100);
  const dailyRate = rate.div(365);
  return cost.mul(dailyRate).mul(daysHeld);
}
```

### Capital Gains Tax Engine
Implements Australian CGT rules with 50% discount for assets held >12 months:

```typescript
function calculateCapitalGain(
  costBase: Decimal,
  salePrice: Decimal,
  holdingPeriodDays: number
): CapitalGainResult {
  const grossGain = salePrice.sub(costBase);
  const discountApplied = holdingPeriodDays > 365;
  const taxableGain = discountApplied ? grossGain.mul(0.5) : grossGain;
  
  return {
    grossGain,
    discountApplied,
    taxableGain
  };
}
```

### Capital vs Revenue Guard
Automatically categorizes expenses to prevent capital costs being treated as deductions:

```typescript
const CAPITAL_CATEGORIES = [
  'Buyers Agent Fees',
  'Stamp Duty',
  'Initial Repairs',
  'Legal Fees (Purchase)',
  'Building Inspections'
];

function categorizeExpense(category: string, amount: Decimal): ExpenseType {
  if (CAPITAL_CATEGORIES.includes(category)) {
    return { type: 'capital', addToCostBase: true };
  }
  return { type: 'revenue', deductible: true };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable acceptance criteria, I identified several areas where properties can be consolidated:

**Calculation Properties**: Properties 4.2, 4.5, 6.1, 8.2, 8.4, 11.3, 11.4, and 11.5 all relate to tax calculations and can be grouped into comprehensive calculation properties.

**UI Behavior Properties**: Properties 1.1, 1.2, 1.3, 2.1, 4.1, 5.2, and 13.3 relate to UI behavior and can be consolidated where they test similar interaction patterns.

**Data Management Properties**: Properties 3.1, 3.4, 3.6, 10.1 relate to data handling and can be combined into comprehensive data integrity properties.

### Converting EARS to Properties

Based on the prework analysis, here are the consolidated correctness properties:

**Property 1: Dashboard Display Completeness**
*For any* dashboard state, the rendered dashboard should contain estimated taxable income, 12-month trend graph, and safety check indicators
**Validates: Requirements 1.1, 1.2, 1.3**

**Property 2: Navigation System Completeness**
*For any* application state, the navigation system should provide access to all required sections: Dashboard, Property Portfolio, Personal Income, Work Deductions, Crypto & Assets, and Settings
**Validates: Requirements 2.1**

**Property 3: Property Management Integrity**
*For any* set of properties, each property should have a unique address and expenses should be correctly categorized as capital or revenue
**Validates: Requirements 3.1, 3.4, 3.6**

**Property 4: Work From Home Calculation Accuracy**
*For any* WFH method selection and input values, the calculated deduction should match the expected formula (fixed rate: hours × $0.70, actual cost: sum of components)
**Validates: Requirements 4.1, 4.2**

**Property 5: Depreciation Calculation Correctness**
*For any* asset over $300, the depreciation calculation should use the diminishing value formula: Cost × (200% / Effective Life) × (Days Held / 365)
**Validates: Requirements 4.5**

**Property 6: Ownership Percentage Application**
*For any* property income or expense, the calculated amount should be multiplied by the user's ownership percentage before being included in totals
**Validates: Requirements 6.1**

**Property 7: Grey Area Warning Display**
*For any* receipt category selection, if the category is marked as "grey area", a warning message should be displayed
**Validates: Requirements 5.2**

**Property 8: Clipboard Integration**
*For any* depreciation helper activation, the formatted AI prompt should be copied to the system clipboard
**Validates: Requirements 7.2**

**Property 9: Reactive Tax Calculations**
*For any* change to income or deduction data, the estimated taxable income should be automatically recalculated
**Validates: Requirements 8.2, 8.4**

**Property 10: Data Persistence Integrity**
*For any* data operation, all information should be stored in and retrievable from IndexedDB without data loss
**Validates: Requirements 10.1**

**Property 11: Capital Gains Calculation Accuracy**
*For any* crypto transaction pair (buy/sell), the net gain/loss should equal sell price minus cost base, with 50% discount applied if held >12 months
**Validates: Requirements 11.3, 11.4**

**Property 12: FIFO Transaction Ordering**
*For any* series of buy/sell transactions for the same asset, the cost base calculation should use First-In-First-Out ordering by default
**Validates: Requirements 11.5**

**Property 13: Import Confirmation Dialog**
*For any* backup file import attempt, a confirmation dialog should appear with the message "This will replace your current browser data. Are you sure?"
**Validates: Requirements 13.3**

**Property 14: PWA Installation Detection**
*For any* application state, if the app is running in standalone mode (installed), the install button should be hidden from the UI
**Validates: Requirements 14.2, 14.3**

## Error Handling

### Input Validation
- **Currency Fields**: Validate positive decimal values, prevent negative amounts where inappropriate
- **Date Fields**: Ensure dates are valid and within reasonable ranges (not future dates for historical transactions)
- **Percentage Fields**: Validate ownership percentages sum to 100% across all owners
- **File Uploads**: Validate file types (PDF, JPG, PNG) and size limits (5MB maximum)

### Calculation Error Handling
- **Division by Zero**: Handle cases where effective life years is zero or invalid
- **Decimal Precision**: Use decimal.js throughout to prevent floating-point errors
- **Negative Results**: Handle scenarios where calculations result in negative values appropriately

### Data Integrity
- **Database Errors**: Graceful handling of IndexedDB failures with user notification
- **Import/Export Errors**: Validate backup file format and handle corruption gracefully
- **State Consistency**: Ensure UI state remains consistent with database state

### User Experience
- **Loading States**: Show appropriate loading indicators during calculations and data operations
- **Error Messages**: Provide clear, actionable error messages in plain language
- **Recovery Options**: Offer users ways to recover from errors (retry, reset, restore backup)

## Testing Strategy

### Dual Testing Approach
The application will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Test specific tax calculation scenarios with known inputs/outputs
- Test UI component rendering with various props
- Test database operations with sample data
- Test error conditions and edge cases

**Property Tests**: Verify universal properties across all inputs
- Use fast-check library for property-based testing in TypeScript
- Generate random financial data to test calculation properties
- Test UI properties with randomly generated component states
- Minimum 100 iterations per property test

### Property Test Configuration
Each property test will be tagged with comments referencing the design document:
```typescript
// Feature: taxflow-australia, Property 4: Work From Home Calculation Accuracy
test('WFH calculations are accurate for all valid inputs', () => {
  fc.assert(fc.property(
    fc.integer(1, 8760), // hours worked (1 to full year)
    fc.record({
      electricity: fc.float(0, 10000),
      internet: fc.float(0, 5000),
      cleaning: fc.float(0, 2000)
    }),
    (hours, actualCosts) => {
      // Property test implementation
    }
  ), { numRuns: 100 });
});
```

### Testing Libraries
- **Jest**: Primary testing framework
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing
- **MSW**: API mocking for external services
- **@testing-library/user-event**: User interaction testing

### Test Categories
1. **Calculation Tests**: Verify all tax calculation logic
2. **UI Tests**: Ensure components render correctly and handle user interactions
3. **Integration Tests**: Test data flow between components and database
4. **Property Tests**: Verify universal correctness properties
5. **E2E Tests**: Test complete user workflows

The testing strategy ensures that both specific scenarios work correctly (unit tests) and that the system behaves correctly across all possible inputs (property tests), providing comprehensive validation of the tax calculation engine's correctness.