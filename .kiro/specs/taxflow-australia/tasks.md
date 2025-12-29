# Implementation Plan: TaxFlow Australia

## Overview

This implementation plan breaks down the TaxFlow Australia application into discrete coding tasks that build incrementally. The approach prioritizes core functionality first, then adds advanced features like PWA support and cross-device synchronization. Each task includes property-based tests to ensure correctness of tax calculations and data handling.

## Tasks

- [x] 1. Project Setup and Core Infrastructure
  - Initialize Vite + React + TypeScript project with proper configuration
  - Install and configure dependencies: Zustand, Dexie.js, decimal.js, Tailwind CSS
  - Set up project structure with folders for components, stores, database, utils, and types
  - Configure TypeScript strict mode and ESLint rules
  - Create initial tax_tables.json with 2024-2025 ATO values as seed data
  - _Requirements: Technical Stack, 15.1_

- [ ]* 1.1 Set up testing framework
  - Install and configure Jest, React Testing Library, and fast-check for property-based testing
  - Create test utilities and setup files
  - Configure test coverage reporting
  - _Requirements: Technical Stack_

- [ ] 2. Database Schema and Data Layer
  - [x] 2.1 Implement Dexie.js database schema
    - Create TaxFlowDatabase class with all required tables including taxSettings table
    - Define TypeScript interfaces for all data models including TaxSettings
    - Implement database initialization with tax_tables.json seed data migration
    - Add version management for schema updates
    - _Requirements: 10.1, 15.1_

  - [ ]* 2.2 Write property test for database operations
    - **Property 10: Data Persistence Integrity**
    - **Validates: Requirements 10.1**

  - [/] 2.3 Create data access layer
    - Implement CRUD operations for all entities (properties, receipts, crypto transactions)
    - Add data validation and error handling
    - Create database utility functions
    - **STATUS: Basic implementation exists, needs enhancement (see Task 19)**
    - _Requirements: 10.1_

- [ ] 3. Design System and Theme Implementation
  - [x] 3.1 Extract and implement design tokens from Stitch design
    - Create TaxFlow theme configuration with colors, typography, and spacing
    - Configure Tailwind CSS with custom dark theme
    - Implement reusable component classes
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Create core UI components
    - Build Card, Button, Input, Select, and Modal components
    - Implement responsive layout components
    - Add loading states and error boundaries
    - _Requirements: 1.1, 2.1_

- [ ] 4. State Management with Zustand
  - [x] 4.1 Implement core application state
    - Create TaxFlowState store with financial year management
    - Add user profile state and actions
    - Implement reactive tax calculation triggers
    - _Requirements: 6.1, 8.2_

  - [ ]* 4.2 Write property test for state management
    - **Property 9: Reactive Tax Calculations**
    - **Validates: Requirements 8.2, 8.4**

- [ ] 5. Dashboard Layout and Navigation
  - [x] 5.1 Implement sidebar navigation
    - Create responsive sidebar with all required navigation items
    - Add active state highlighting and mobile menu
    - Implement financial year display in header
    - _Requirements: 2.1_

  - [ ]* 5.2 Write property test for navigation completeness
    - **Property 2: Navigation System Completeness**
    - **Validates: Requirements 2.1**

  - [x] 5.3 Build dashboard overview page
    - Create dashboard layout with stats cards and chart area
    - Implement estimated taxable income display
    - Add quick action buttons and recent activity feed
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 5.4 Write property test for dashboard display
    - **Property 1: Dashboard Display Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ] 6. Tax Calculation Engine
  - [x] 6.1 Implement core tax calculation utilities
    - Create decimal.js-based calculation functions that pull from active financial year settings
    - Implement Australian tax bracket calculations using user-configurable rates
    - Add ownership percentage application logic
    - Ensure all calculations reference the selected financial year's tax settings
    - _Requirements: 6.1, 8.2, 8.4, 15.5_

  - [ ]* 6.2 Write property test for ownership calculations
    - **Property 6: Ownership Percentage Application**
    - **Validates: Requirements 6.1**

  - [x] 6.3 Implement Work From Home calculator
    - Create WFH calculation logic using configurable rates from tax settings
    - Add method toggle functionality with dynamic rate display
    - Implement input validation and error handling
    - _Requirements: 4.1, 4.2, 15.3_

  - [ ]* 6.4 Write property test for WFH calculations
    - **Property 4: Work From Home Calculation Accuracy**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 6.5 Implement depreciation engine
    - Create diminishing value depreciation calculations
    - Add asset lifecycle management for items over $300
    - Implement automatic depreciation scheduling
    - _Requirements: 4.5_

  - [ ]* 6.6 Write property test for depreciation calculations
    - **Property 5: Depreciation Calculation Correctness**
    - **Validates: Requirements 4.5**

- [ ] 7. Capital Revenue Guard System
  - [x] 7.1 Implement expense categorization logic
    - Create automatic categorization for capital vs revenue expenses
    - Add buyers agent fees and stamp duty handling
    - Implement cost base calculation logic
    - _Requirements: 3.4, 3.6_

  - [ ]* 7.2 Write property test for expense categorization
    - **Property 3: Property Management Integrity**
    - **Validates: Requirements 3.1, 3.4, 3.6**

- [ ] 8. Checkpoint - Core Tax Engine Complete
  - Ensure all tax calculation tests pass
  - Verify database operations work correctly
  - Ask the user if questions arise

- [ ] 9. Property Portfolio Management
  - [x] 9.1 Create property management interface
    - Build property list view with add/edit functionality
    - Implement tabbed interface for property data entry
    - Add ownership split management
    - _Requirements: 3.1, 3.2_

  - [x] 9.2 Implement property income and expense tracking
    - Create forms for rental income entry
    - Add expense categorization with repair vs improvement toggle
    - Implement loan interest and fee tracking
    - _Requirements: 3.3, 3.4_

  - [x] 9.3 Add purchase data and cost base tracking
    - Create purchase data entry forms
    - Implement cost base calculation and display
    - Add depreciation schedule integration
    - _Requirements: 3.5, 7.1_

- [x] 10. Crypto and Capital Gains Engine
  - [x] 10.1 Implement crypto transaction management
    - Create buy/sell transaction entry forms
    - Add asset name and quantity tracking
    - Implement transaction history display
    - _Requirements: 11.1, 11.2_

  - [x] 10.2 Build capital gains calculation engine
    - Implement FIFO cost base calculations
    - Add 50% CGT discount for assets held >12 months
    - Create capital gains/losses reporting
    - _Requirements: 11.3, 11.4, 11.5_

  - [ ]* 10.3 Write property test for capital gains calculations
    - **Property 11: Capital Gains Calculation Accuracy**
    - **Validates: Requirements 11.3, 11.4**

  - [ ]* 10.4 Write property test for FIFO ordering
    - **Property 12: FIFO Transaction Ordering**
    - **Validates: Requirements 11.5**

- [x] 11. Receipt Entry and Management System
  - [x] 11.1 Create receipt entry modal
    - Build receipt entry form with all required fields
    - Implement file upload for receipt attachments
    - Add category selection with grey area warnings
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 11.2 Write property test for grey area warnings
    - **Property 7: Grey Area Warning Display**
    - **Validates: Requirements 5.2**

  - [x] 11.3 Implement receipt storage and retrieval
    - Add receipt persistence to IndexedDB with file attachments
    - Create receipt list and search functionality
    - Implement receipt editing and deletion
    - _Requirements: 5.4, 5.5_

- [x] 12. Gemini Helper Integration
  - [x] 12.1 Implement depreciation helper feature
    - Create AI prompt generation for depreciation schedules
    - Add clipboard integration for prompt copying
    - Implement toast notifications for user feedback
    - _Requirements: 7.2, 7.3_

  - [ ]* 12.2 Write property test for clipboard integration
    - **Property 8: Clipboard Integration**
    - **Validates: Requirements 7.2**

- [x] 13. Data Export and Backup System
  - [x] 13.1 Implement manual backup functionality
    - Create database export to encrypted JSON
    - Add backup file generation with timestamps
    - Implement backup download functionality
    - _Requirements: 9.1, 13.1_

  - [x] 13.2 Create data import and restore system
    - Build backup file upload and validation
    - Add import confirmation dialog with data loss warning
    - Implement data restoration with integrity checks
    - _Requirements: 13.2, 13.3_

  - [ ]* 13.3 Write property test for import confirmation
    - **Property 13: Import Confirmation Dialog**
    - **Validates: Requirements 13.3**

- [ ] 14. Cross-Device Synchronization
  - [ ] 14.1 Implement OneDrive sync functionality
    - Create encrypted file export for cloud storage
    - Add startup sync detection and user prompts
    - Implement manual sync triggers from settings
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 14.2 Add sync conflict resolution
    - Create timestamped backup creation before imports
    - Add AES-256 encryption for cloud files
    - Implement sync status indicators
    - _Requirements: 12.4, 12.5_

- [x] 15. Progressive Web App Implementation
  - [x] 15.1 Configure PWA manifest and service worker
    - Create manifest.json with proper app metadata
    - Implement service worker for offline functionality
    - Add high-resolution app icons (512x512)
    - _Requirements: 14.1, 14.5_

  - [x] 15.2 Build PWA installation features
    - Implement custom install button with beforeinstallprompt handling
    - Add standalone mode detection to hide install button when installed
    - Create installation guide page with platform-specific instructions
    - _Requirements: 14.2, 14.3, 14.4_

  - [ ]* 15.3 Write property test for PWA installation detection
    - **Property 14: PWA Installation Detection**
    - **Validates: Requirements 14.2, 14.3**

- [x] 16. Tax Settings Management
  - [x] 16.1 Create tax settings interface
    - Build tax settings page with financial year selection
    - Implement tax bracket configuration with add/edit/delete functionality
    - Add WFH rate, vehicle rate, and meal allowance configuration
    - Create help tooltips with ATO search terms for each setting
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 16.2 Implement settings validation and persistence
    - Add validation for tax bracket thresholds and rates
    - Implement settings save/load from IndexedDB
    - Create settings backup and restore functionality
    - Add settings migration for new financial years
    - _Requirements: 15.1, 15.5_

- [x] 17. Safety Check and ATO Compliance
  - [x] 17.1 Implement safety check system
    - Create ATO average comparison logic
    - Build traffic light risk indicator system
    - Add detailed safety check reporting
    - _Requirements: 1.3_

  - [/] 17.2 Add compliance validation
    - Implement expense validation against ATO guidelines
    - Create warning systems for high-risk deductions
    - Add compliance reporting features
    - **STATUS: Basic implementation exists, needs enhancement (see Task 20)**
    - _Requirements: 8.1, 8.3_

- [ ] 18. Critical UI/UX Fixes (Missing Functionality)
  - [ ] 18.1 Connect Dashboard Quick Actions
    - Add onClick handler to "Snap Receipt" button to navigate to receipts page
    - Add onClick handler to "Manual Deduction" button to open deduction modal
    - Add onClick handler to "Connect Bank" button with coming soon placeholder
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 18.2 Connect Sidebar New Entry Button
    - Add onClick handler to "New Entry" button in sidebar
    - Implement dropdown menu or modal for quick entry options (Receipt, Deduction, Income)
    - _Requirements: 2.1_

  - [ ] 18.3 Fix Dashboard "View All" Links
    - Connect "View All" button in Recent Activity section to appropriate pages
    - Add navigation functionality to all dashboard action buttons
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 19. Enhanced Data Access Layer
  - [ ] 19.1 Improve error handling and validation
    - Add comprehensive data validation for all CRUD operations
    - Implement better transaction management for complex operations
    - Add retry logic for failed database operations
    - _Requirements: 10.1_

  - [ ] 19.2 Add advanced data utilities
    - Create utility functions for complex queries and aggregations
    - Implement data migration helpers for schema updates
    - Add data integrity checks and repair functions
    - _Requirements: 10.1_

- [ ] 20. Advanced Compliance Validation
  - [ ] 20.1 Implement ATO guidelines validation
    - Add validation rules for common deduction categories
    - Create warning system for expenses that exceed ATO benchmarks
    - Implement occupation-specific deduction limits
    - _Requirements: 8.1, 8.3_

  - [ ] 20.2 Enhanced safety check system
    - Add detailed compliance reporting with specific recommendations
    - Implement category-specific risk assessment
    - Create audit preparation checklist and documentation suggestions
    - _Requirements: 1.3, 8.1_

- [ ] 21. Testing Framework Implementation
  - [ ] 21.1 Set up Jest and React Testing Library
    - Install and configure Jest with TypeScript support
    - Set up React Testing Library for component testing
    - Configure test coverage reporting and thresholds
    - _Requirements: Technical Stack_

  - [ ] 21.2 Implement critical property-based tests
    - Set up fast-check for property-based testing
    - Implement Property 4: Work From Home Calculation Accuracy
    - Implement Property 11: Capital Gains Calculation Accuracy
    - Implement Property 6: Ownership Percentage Application
    - _Requirements: 4.1, 4.2, 11.3, 11.4, 6.1_

  - [ ] 21.3 Add unit tests for core functionality
    - Test tax calculation utilities with known scenarios
    - Test database operations with sample data
    - Test UI components with various props and states
    - _Requirements: All core functionality_

- [ ] 22. Final Integration and Polish
  - [ ] 22.1 Complete end-to-end integration
    - Ensure all UI elements are properly connected
    - Implement proper error boundaries and loading states
    - Add comprehensive input validation across all forms
    - _Requirements: All_

  - [ ] 22.2 Performance optimization
    - Optimize database queries and indexing
    - Implement proper memoization for expensive calculations
    - Add lazy loading for large data sets
    - _Requirements: 10.1_

  - [ ]* 22.3 Write integration tests
    - Test complete user workflows from data entry to export
    - Verify tax calculation accuracy across all scenarios
    - Test PWA functionality and offline capabilities
    - _Requirements: All_

- [ ] 23. Final Checkpoint - Complete Application
  - Ensure all critical UI connections are working
  - Verify all quick actions and navigation buttons function properly
  - Test backup/restore and sync functionality
  - Test tax settings management across multiple financial years
  - Verify PWA installation works on multiple platforms
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks marked with `[/]` are partially implemented and need completion
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and user feedback
- The implementation prioritizes tax calculation accuracy and data integrity
- PWA features enable desktop and mobile app installation
- All financial calculations use decimal.js to prevent floating-point errors
- Tax settings are user-configurable and future-proof for ATO rate changes

## Current Implementation Status (85% Complete)

**✅ Fully Implemented:**
- Core tax calculation engine with decimal.js precision
- Property portfolio management with full CRUD operations
- Crypto & capital gains tracking with FIFO calculations
- Receipt management with file uploads and grey area warnings
- Tax settings management with user-configurable rates
- PWA implementation with installation and offline support
- Data backup/restore with JSON export/import
- Gemini Helper for AI-assisted depreciation calculations
- Work From Home calculator with both fixed rate and actual cost methods
- Safety check system with risk indicators

**⚠️ Partially Implemented:**
- Data access layer (basic CRUD exists, needs robustness)
- Compliance validation (basic safety check exists, needs ATO guidelines)
- End-to-end integration (core features work, UI connections missing)

**❌ Missing Critical Features:**
- Dashboard quick action button functionality
- Sidebar "New Entry" button functionality
- Cross-device synchronization (OneDrive sync)
- Testing framework (Jest, React Testing Library, property tests)
- Advanced compliance validation with ATO guidelines

**🚀 Priority Fixes:**
1. **HIGH:** Connect dashboard quick actions and sidebar buttons (Tasks 18.1-18.3)
2. **MEDIUM:** Set up testing framework for tax calculation validation (Task 21)
3. **LOW:** Implement cross-device sync for power users (Task 14)