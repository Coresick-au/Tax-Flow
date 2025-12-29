# Requirements Document

## Introduction

TaxFlow Australia is a local-first fintech application designed to help Australian taxpayers manage their tax returns efficiently. The system provides a dark mode, data-dense, mobile-responsive dashboard for tracking income, expenses, deductions, and property portfolios with specialized Australian Tax Office (ATO) compliance features.

## Glossary

- **TaxFlow_System**: The complete TaxFlow Australia application
- **Dashboard**: The main overview interface showing net tax position
- **Property_Portfolio**: Collection of investment properties with income/expense tracking
- **Work_Deductions**: Employment-related tax deductions including WFH calculations
- **Asset_Register**: Tracking system for depreciable assets over $300
- **Receipt_Modal**: Pop-up interface for entering expense receipts
- **Safety_Check**: Traffic light system comparing expenses to ATO averages
- **Depreciation_Engine**: Automated calculation system for asset depreciation
- **Capital_Revenue_Guard**: System preventing capital costs from being treated as deductions
- **WFH_Calculator**: Work from home expense calculation system
- **Gemini_Helper**: AI integration for processing depreciation schedules
- **CGT_Engine**: Capital Gains Tax calculation system for crypto and asset transactions
- **IndexedDB**: Browser-based database for storing large files and structured data

## Requirements

### Requirement 1: Core Dashboard Interface

**User Story:** As a taxpayer, I want a comprehensive dashboard overview, so that I can quickly assess my tax position and take necessary actions.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL display estimated taxable income as a prominent figure on the dashboard
2. WHEN the dashboard loads, THE TaxFlow_System SHALL show a 12-month income vs expenses trend graph
3. THE Safety_Check SHALL display a traffic light system indicating expense risk levels compared to ATO averages
4. THE TaxFlow_System SHALL provide quick action buttons for common tasks like receipt capture and deduction logging
5. THE Dashboard SHALL display current financial year context and user profile information

### Requirement 2: Sidebar Navigation System

**User Story:** As a user, I want intuitive navigation between different tax categories, so that I can efficiently manage all aspects of my tax return.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL provide navigation to Dashboard, Property Portfolio, Personal Income, Work Deductions, Crypto & Assets, and Settings sections
2. WHEN a navigation item is selected, THE TaxFlow_System SHALL highlight the active section
3. THE TaxFlow_System SHALL maintain responsive navigation that adapts to mobile devices
4. THE TaxFlow_System SHALL display the current financial year in the navigation header

### Requirement 3: Property Portfolio Management

**User Story:** As a property investor, I want to track multiple properties with ownership splits and comprehensive expense categories, so that I can accurately calculate rental income deductions.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL allow adding multiple properties with unique addresses
2. WHEN a property is created, THE TaxFlow_System SHALL require ownership percentage specification
3. THE Property_Portfolio SHALL provide tabbed interfaces for Income, Recurrent Expenses, Maintenance Log, Loans, and Purchase Data
4. WHEN recording maintenance expenses, THE TaxFlow_System SHALL distinguish between repairs and capital improvements
5. THE TaxFlow_System SHALL track purchase data including cost base, buyers agent fees, and stamp duty
6. THE Capital_Revenue_Guard SHALL automatically categorize buyers agent fees and stamp duty as capital costs

### Requirement 4: Work Deductions Calculator

**User Story:** As an employee, I want to calculate work-from-home expenses and track depreciable assets, so that I can maximize my legitimate tax deductions.

#### Acceptance Criteria

1. THE WFH_Calculator SHALL provide toggle between "Fixed Rate (67c)" and "Actual Cost" methods
2. WHEN "Fixed Rate" is selected, THE TaxFlow_System SHALL calculate deductions as total hours × $0.67
3. WHEN "Actual Cost" is selected, THE TaxFlow_System SHALL sum electricity, internet, and furniture depreciation portions
4. THE Asset_Register SHALL track tools and equipment over $300 with purchase value, current value, and annual deduction
5. THE Depreciation_Engine SHALL automatically calculate diminishing value depreciation for eligible assets

### Requirement 5: Receipt Entry System

**User Story:** As a taxpayer, I want a streamlined receipt entry process with category validation, so that I can quickly record expenses with appropriate tax treatment.

#### Acceptance Criteria

1. THE Receipt_Modal SHALL provide fields for date, vendor, amount, category, and description
2. WHEN a "grey area" tax category is selected, THE TaxFlow_System SHALL display warning messages with guidance
3. THE TaxFlow_System SHALL validate required fields before allowing receipt submission
4. THE Receipt_Modal SHALL support file upload for receipt images and PDFs
5. THE TaxFlow_System SHALL categorize expenses appropriately for tax deduction calculations

### Requirement 6: Ownership and Financial Year Management

**User Story:** As a taxpayer with shared investments, I want to handle ownership splits and financial year transitions, so that I can accurately report my portion of income and expenses.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL apply ownership percentages to all property income and expense calculations
2. WHEN calculating totals, THE TaxFlow_System SHALL multiply each item by the user's ownership percentage
3. THE TaxFlow_System SHALL support adding multiple owners with specified percentages
4. THE TaxFlow_System SHALL allow cloning financial year data for year-over-year continuity
5. THE TaxFlow_System SHALL maintain separate data sets for each financial year

### Requirement 7: Depreciation Integration

**User Story:** As a property investor, I want to integrate quantity surveyor depreciation schedules, so that I can accurately claim depreciation deductions without manual calculations.

#### Acceptance Criteria

1. THE Gemini_Helper SHALL generate AI prompts for processing depreciation schedules
2. WHEN the depreciation helper is activated, THE TaxFlow_System SHALL copy formatted instructions to the system clipboard
3. THE TaxFlow_System SHALL accept JSON input for Division 40 plant/equipment and Division 43 capital works deductions
4. THE TaxFlow_System SHALL integrate depreciation amounts into total deduction calculations
5. THE TaxFlow_System SHALL maintain depreciation data separately from other expense categories

### Requirement 8: Tax Calculation Engine

**User Story:** As a taxpayer, I want automated tax calculations based on current ATO rates, so that I can estimate my tax liability accurately.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL maintain configurable tax tables with current ATO rates
2. WHEN income or deductions change, THE TaxFlow_System SHALL recalculate estimated taxable income
3. THE TaxFlow_System SHALL calculate estimated tax payable based on current tax brackets
4. THE TaxFlow_System SHALL distinguish between capital costs and revenue deductions in calculations
5. THE TaxFlow_System SHALL provide year-over-year comparison indicators

### Requirement 9: Data Export and Reporting

**User Story:** As a taxpayer, I want to export my tax data in a structured format, so that I can provide it to accountants or tax preparation software.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL generate comprehensive JSON export of all tax data
2. THE TaxFlow_System SHALL organize exported data by categories (income, deductions, properties, assets)
3. WHEN exporting, THE TaxFlow_System SHALL include ownership adjustments and calculated totals
4. THE TaxFlow_System SHALL maintain data integrity in exported formats
5. THE TaxFlow_System SHALL provide export functionality accessible from the main dashboard

### Requirement 10: Local-First Data Management

**User Story:** As a privacy-conscious user, I want my tax data stored locally without external dependencies, so that I can maintain control over sensitive financial information.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL store all data locally using IndexedDB via Dexie.js without requiring external databases
2. THE TaxFlow_System SHALL persist data across browser sessions including receipt images and PDFs
3. THE TaxFlow_System SHALL maintain data consistency during application updates
4. THE TaxFlow_System SHALL provide data backup and restore capabilities
5. THE TaxFlow_System SHALL function completely offline after initial load

### Requirement 11: Crypto & Capital Gains Engine

**User Story:** As an investor, I want to track cryptocurrency and asset buy/sell events to calculate Capital Gains Tax (CGT), so that I can accurately report capital gains and losses.

#### Acceptance Criteria

1. THE CGT_Engine SHALL allow manual entry of buy events with date, asset name, price, and quantity
2. THE CGT_Engine SHALL allow manual entry of sell events with date, asset name, price, and quantity
3. WHEN calculating gains/losses, THE CGT_Engine SHALL automatically calculate net gain/loss as sell price minus cost base
4. THE CGT_Engine SHALL apply 50% CGT discount when assets are held for more than 12 months
5. THE CGT_Engine SHALL use FIFO (First-In-First-Out) calculation method as default unless overridden
6. THE TaxFlow_System SHALL display capital gains/losses separately from other income categories
7. THE CGT_Engine SHALL maintain accurate cost base calculations across multiple buy/sell transactions

### Requirement 12: Cross-Device Data Roaming

**User Story:** As a user who moves between different PCs and browsers, I want my data to persist across devices without a traditional backend, so that I always have the latest version of my tax records.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL provide an "Export to OneDrive" feature that packages the IndexedDB database into a single encrypted file
2. WHEN the app opens, THE TaxFlow_System SHALL check for a local file in a designated sync folder and prompt user to sync if cloud version is newer
3. THE TaxFlow_System SHALL include a manual backup button in the Settings menu for on-demand exports
4. THE TaxFlow_System SHALL create timestamped backups before any import action to ensure data integrity
5. THE TaxFlow_System SHALL support AES-256 encryption for exported files using user-defined passwords to ensure privacy on cloud storage

### Requirement 13: Manual Data Portability

**User Story:** As a user, I want to manually backup and restore my tax data, so that I can protect against data loss and transfer data between devices or browsers.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL provide a "Backup Database" button that generates a single encrypted JSON file containing all property, income, and asset data
2. THE TaxFlow_System SHALL provide a "Restore from Backup" button that allows users to upload and import backup files
3. WHEN a backup file is imported, THE TaxFlow_System SHALL prompt the user with "This will replace your current browser data. Are you sure?" to prevent accidental data loss
4. THE TaxFlow_System SHALL validate backup file integrity before allowing import operations
5. THE TaxFlow_System SHALL generate timestamped backup filenames to help users organize multiple backup versions

### Requirement 14: PWA Support & In-App Installation Guide

**User Story:** As a user, I want to install TaxFlow AU as a standalone desktop or mobile app, so that I can access it quickly from my taskbar/homescreen without browser clutter.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL be configured as a Progressive Web App (PWA) with a valid manifest.json and Service Worker for offline support
2. THE TaxFlow_System SHALL implement a custom "Install App" button in the Sidebar/Settings that triggers the browser's native beforeinstallprompt event
3. THE TaxFlow_System SHALL detect if it is already running in "standalone" mode (installed) and hide the install button if so
4. THE TaxFlow_System SHALL include a "Help & Installation" page featuring visual instructions for Chrome/Edge, iOS Safari, and Android Chrome installation methods
5. THE TaxFlow_System SHALL use a high-resolution icon (512x512) for the splash screen and desktop shortcut to ensure professional appearance

### Requirement 15: User-Managed Tax Tables

**User Story:** As a user, I want to manage tax settings for different financial years, so that I can keep the application current with ATO rate changes and handle multiple financial years accurately.

#### Acceptance Criteria

1. THE TaxFlow_System SHALL provide a "Tax Settings" interface where users can manually add, edit, or delete financial year configurations
2. THE TaxFlow_System SHALL allow users to define personal income tax brackets with thresholds and rates for each financial year
3. THE TaxFlow_System SHALL allow users to configure WFH fixed rate ($/hr), vehicle cents per km rate, and reasonable overtime meal allowance amounts
4. THE TaxFlow_System SHALL include help tooltips for each field with specific ATO search terms needed to find the latest values
5. THE TaxFlow_System SHALL ensure all tax calculations use the settings from the active financial year selected by the user

## Technical Stack

### Architecture Requirements

**User Story:** As a developer, I want clear technical constraints to ensure consistent implementation and optimal performance.

#### Technical Specifications

1. THE TaxFlow_System SHALL be built as a Pure React application using Vite and TypeScript
2. THE TaxFlow_System SHALL NOT use any Python backend - all tax logic must execute in the browser using TypeScript
3. THE TaxFlow_System SHALL use decimal.js library for all currency calculations to prevent floating-point arithmetic errors
4. THE TaxFlow_System SHALL use Zustand for state management
5. THE TaxFlow_System SHALL use Dexie.js as IndexedDB wrapper for data persistence and large file storage