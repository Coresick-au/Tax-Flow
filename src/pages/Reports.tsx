import { useEffect, useState } from 'react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { DashboardLayout } from '../components/layout';
import { Card, CardHeader, Button } from '../components/ui';
import { Download, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { db } from '../database/db';
import type { IncomeRecord, Receipt, DepreciableAsset, Property, PropertyExpense, WorkDeductions, AccountantNote } from '../types';
import Decimal from 'decimal.js';

interface ReportData {
    incomeRecords: IncomeRecord[];
    receipts: Receipt[];
    assets: DepreciableAsset[];
    properties: Property[];
    propertyExpenses: PropertyExpense[];
    workDeductions: WorkDeductions | null;
    accountantNotes: AccountantNote[];
}

export function Reports() {
    const {
        initialize,
        isInitialized,
        currentFinancialYear,
        currentProfileId,
        estimatedTaxableIncome,
        estimatedTaxPayable,
        totalDeductions,
        safetyCheckItems,
        auditRiskLevel,
        taxSettings,
    } = useTaxFlowStore();

    const [reportData, setReportData] = useState<ReportData>({
        incomeRecords: [],
        receipts: [],
        assets: [],
        properties: [],
        propertyExpenses: [],
        workDeductions: null,
        accountantNotes: [],
    });
    const [includeAccountantNotes, setIncludeAccountantNotes] = useState(true);

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        income: true,
        expenses: true,
        assets: false,
        wfh: false,
        property: false,
        notes: false,
    });

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Load detailed data
    useEffect(() => {
        async function loadReportData() {
            const incomeRecords = await db.income
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            const receipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            const assets = await db.depreciableAssets
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            const properties = await db.properties.toArray();

            const propertyExpenses = await db.propertyExpenses
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            const workDeductions = await db.workDeductions
                .where('financialYear')
                .equals(currentFinancialYear)
                .first();

            const notes = await db.accountantNotes
                .where('financialYear')
                .equals(currentFinancialYear)
                .toArray();

            setReportData({
                incomeRecords: incomeRecords
                    .filter(r => r.profileId === currentProfileId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                receipts: receipts
                    .filter(r => r.profileId === currentProfileId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                assets: assets,
                properties: properties, // Properties are global in v6
                propertyExpenses: propertyExpenses,
                workDeductions: workDeductions || null,
                accountantNotes: notes.filter(n => !n.profileId || n.profileId === currentProfileId),
            });
        }

        if (isInitialized) {
            loadReportData();
        }
    }, [isInitialized, currentFinancialYear, currentProfileId]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Calculate derived values
    const medicareLevy = estimatedTaxableIncome.mul(
        (taxSettings?.hasPrivateHealthInsurance) ? 0 : 0.02
    );
    const totalIncome = estimatedTaxableIncome.plus(totalDeductions);

    // Calculate totals from line items
    const incomeTotal = reportData.incomeRecords.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
    const expenseTotal = reportData.receipts.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));

    // Data for charts
    const incomeData = [
        { name: 'Net Income', value: estimatedTaxableIncome.toNumber() },
        { name: 'Tax', value: estimatedTaxPayable.toNumber() },
    ];

    const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

    const getRiskColor = (status: 'safe' | 'warning' | 'danger') => {
        switch (status) {
            case 'safe': return 'text-success bg-success/10';
            case 'warning': return 'text-warning bg-warning/10';
            case 'danger': return 'text-danger bg-danger/10';
        }
    };

    const formatCategory = (cat: string) => cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const handleExportPDF = async () => {
        const { incomeRecords, receipts, assets, workDeductions, accountantNotes, properties, propertyExpenses } = reportData;
        const hasPrivateHealthIns = taxSettings?.hasPrivateHealthInsurance || false;

        // Load property income data
        const propertyIncomeRecords = await db.propertyIncome
            .where('financialYear')
            .equals(currentFinancialYear)
            .toArray();

        // Group property expenses and income by property
        const expensesByProperty = propertyExpenses.reduce((acc, expense) => {
            if (!acc[expense.propertyId]) acc[expense.propertyId] = [];
            acc[expense.propertyId].push(expense);
            return acc;
        }, {} as Record<number, typeof propertyExpenses>);

        const incomeByProperty = propertyIncomeRecords.reduce((acc, income) => {
            if (!acc[income.propertyId]) acc[income.propertyId] = 0;
            acc[income.propertyId] += parseFloat(income.grossRent || '0') +
                parseFloat(income.insurancePayouts || '0') +
                parseFloat(income.otherIncome || '0');
            return acc;
        }, {} as Record<number, number>);

        const printContent = `
            <html>
            <head>
                <title>TaxFlow Australia - Tax Summary FY ${currentFinancialYear}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; font-size: 12px; }
                    h1 { color: #10b981; margin-bottom: 5px; font-size: 24px; }
                    h2 { color: #374151; margin-top: 25px; border-bottom: 2px solid #10b981; padding-bottom: 8px; font-size: 16px; }
                    h3 { color: #6b7280; margin-top: 15px; font-size: 14px; }
                    .header-info { color: #6b7280; margin-bottom: 20px; }
                    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                    .label { color: #6b7280; }
                    .value { font-weight: bold; }
                    .total { background: #f3f4f6; padding: 12px; margin: 10px 0; border-radius: 8px; }
                    .total .value { color: #10b981; font-size: 1.1em; }
                    .tax { color: #ef4444; }
                    .risk-section { margin-top: 15px; padding: 12px; border-radius: 8px; }
                    .risk-low { background: #d1fae5; border: 1px solid #10b981; }
                    .risk-medium { background: #fef3c7; border: 1px solid #f59e0b; }
                    .risk-high { background: #fee2e2; border: 1px solid #ef4444; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                    th { background: #f9fafb; font-weight: 600; color: #374151; }
                    .text-right { text-align: right; }
                    .footer { margin-top: 40px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px; }
                    .section { page-break-inside: avoid; }
                    .empty { color: #9ca3af; font-style: italic; padding: 15px; text-align: center; }
                    .property-page { page-break-before: always; }
                </style>
            </head>
            <body>
                <h1>TaxFlow Australia</h1>
                <div class="header-info">
                    <p><strong>Tax Summary Report</strong> for Financial Year ${currentFinancialYear}</p>
                    <p>Generated: ${new Date().toLocaleDateString('en-AU', { dateStyle: 'full' })} at ${new Date().toLocaleTimeString('en-AU')}</p>
                </div>
                
                <!-- INCOME SUMMARY -->
                <div class="section">
                    <h2>1. Income Summary</h2>
                    <div class="summary-row">
                        <span class="label">Gross Income</span>
                        <span class="value">$${totalIncome.toNumber().toLocaleString()}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Total Deductions</span>
                        <span class="value">-$${totalDeductions.toNumber().toLocaleString()}</span>
                    </div>
                    <div class="total">
                        <div class="summary-row" style="border: none;">
                            <span class="label">Taxable Income</span>
                            <span class="value">$${estimatedTaxableIncome.toNumber().toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                ${incomeRecords.length > 0 ? `
                <!-- INCOME DETAILS -->
                <div class="section">
                    <h3>1.1 Income Line Items</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Payer</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th class="text-right">Gross Amount</th>
                                <th class="text-right">Tax Withheld</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${incomeRecords.map(r => `
                                <tr>
                                    <td>${new Date(r.date).toLocaleDateString('en-AU')}</td>
                                    <td>${r.payer || 'N/A'}</td>
                                    <td>${formatCategory(r.category)}</td>
                                    <td>${r.description || '-'}</td>
                                    <td class="text-right">$${parseFloat(r.amount).toLocaleString()}</td>
                                    <td class="text-right">${r.taxWithheld ? '$' + parseFloat(r.taxWithheld).toLocaleString() : '-'}</td>
                                </tr>
                            `).join('')}
                            <tr style="font-weight: bold; background: #f9fafb;">
                                <td colspan="4">Total Income</td>
                                <td class="text-right">$${incomeTotal.toNumber().toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                <!-- TAX LIABILITY -->
                <div class="section">
                    <h2>2. Estimated Tax Liability</h2>
                    <div class="summary-row">
                        <span class="label">Income Tax</span>
                        <span class="value tax">$${estimatedTaxPayable.toNumber().toLocaleString()}</span>
                    </div>
                    ${!hasPrivateHealthIns ? `
                    <div class="summary-row">
                        <span class="label">Medicare Levy (2%)</span>
                        <span class="value tax">$${medicareLevy.toNumber().toLocaleString()}</span>
                    </div>
                    ` : `
                    <div class="summary-row">
                        <span class="label">Medicare Levy</span>
                        <span class="value">$0 (Exempt - Private Health Insurance)</span>
                    </div>
                    `}
                    <div class="total">
                        <div class="summary-row" style="border: none;">
                            <span class="label">Total Estimated Tax</span>
                            <span class="value tax">$${estimatedTaxPayable.plus(medicareLevy).toNumber().toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                ${receipts.length > 0 ? `
                <!-- WORK EXPENSES DETAILS -->
                <div class="section">
                    <h2>3. Work-Related Expenses</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Vendor</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${receipts.map(r => `
                                <tr>
                                    <td>${new Date(r.date).toLocaleDateString('en-AU')}</td>
                                    <td>${r.vendor}</td>
                                    <td>${formatCategory(r.category)}</td>
                                    <td>${r.description || '-'}</td>
                                    <td class="text-right">$${parseFloat(r.amount).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                            <tr style="font-weight: bold; background: #f9fafb;">
                                <td colspan="4">Total Work Expenses</td>
                                <td class="text-right">$${expenseTotal.toNumber().toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : ''}

                ${workDeductions ? `
                <!-- WORK FROM HOME -->
                <div class="section">
                    <h2>4. Work From Home Deduction</h2>
                    <div class="summary-row">
                        <span class="label">Method Used</span>
                        <span class="value">${workDeductions.wfhMethod === 'fixed_rate' ? 'Fixed Rate (67c/hour)' : 'Actual Cost Method'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Total WFH Hours</span>
                        <span class="value">${workDeductions.totalHoursWorked || 0} hours</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Calculated Deduction</span>
                        <span class="value">$${(parseFloat(String(workDeductions.totalHoursWorked || 0)) * 0.67).toFixed(2)}</span>
                    </div>
                </div>
                ` : ''}

                ${assets.length > 0 ? `
                <!-- ASSET DEPRECIATION -->
                <div class="section">
                    <h2>5. Asset Depreciation Schedule</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Purchase Date</th>
                                <th class="text-right">Cost</th>
                                <th>Effective Life</th>
                                <th>Method</th>
                                <th class="text-right">This Year Decline</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${assets.map(a => {
            const annualDepreciation = a.method === 'diminishing_value'
                ? (parseFloat(a.cost) * (2 / a.effectiveLifeYears))
                : (parseFloat(a.cost) / a.effectiveLifeYears);
            return `
                                <tr>
                                    <td>${a.itemName}</td>
                                    <td>${new Date(a.purchaseDate).toLocaleDateString('en-AU')}</td>
                                    <td class="text-right">$${parseFloat(a.cost).toLocaleString()}</td>
                                    <td>${a.effectiveLifeYears} years</td>
                                    <td>${a.method === 'diminishing_value' ? 'Diminishing Value' : 'Prime Cost'}</td>
                                    <td class="text-right">$${annualDepreciation.toFixed(2)}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                ${properties.length > 0 ? properties.map((property, idx) => {
                const propExpenses = expensesByProperty[property.id!] || [];
                const totalPropExpenses = propExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
                const rentalIncome = incomeByProperty[property.id!] || 0;
                const netRentalIncome = rentalIncome - totalPropExpenses;

                // Get ownership percentage (use first split or default to 100%)
                const ownershipPct = property.ownershipSplit && property.ownershipSplit.length > 0
                    ? property.ownershipSplit[0].percentage
                    : 100;

                return `
                <!-- PROPERTY: ${property.address} -->
                <div class="section property-page">
                    <h2>Property ${idx + 1}: ${property.address}</h2>
                    <div class="summary-row">
                        <span class="label">Status</span>
                        <span class="value">${property.status}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Purchase Date</span>
                        <span class="value">${property.purchaseDate ? new Date(property.purchaseDate).toLocaleDateString('en-AU') : 'N/A'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Ownership Percentage</span>
                        <span class="value">${ownershipPct}%</span>
                    </div>
                    
                    <h3>Rental Income</h3>
                    ${ownershipPct !== 100 ? `
                    <div class="summary-row">
                        <span class="label">Full Property Income</span>
                        <span class="value">$${rentalIncome.toLocaleString()}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Your ${ownershipPct}% Share</span>
                        <span class="value" style="font-weight: bold; color: #10b981;">$${(rentalIncome * ownershipPct / 100).toLocaleString()}</span>
                    </div>
                    ` : `
                    <div class="summary-row">
                        <span class="label">Gross Rental Income</span>
                        <span class="value">$${rentalIncome.toLocaleString()}</span>
                    </div>
                    `}
                    
                    ${propExpenses.length > 0 ? `
                    <h3>Property Expenses</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${propExpenses.map(e => `
                                <tr>
                                    <td>${new Date(e.date).toLocaleDateString('en-AU')}</td>
                                    <td>${formatCategory(e.category)}</td>
                                    <td>${e.description || '-'}</td>
                                    <td class="text-right">$${parseFloat(e.amount).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                            <tr style="font-weight: bold; background: #f9fafb;">
                                <td colspan="3">Total Expenses</td>
                                <td class="text-right">$${totalPropExpenses.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                    ${ownershipPct !== 100 ? `
                    <div class="summary-row" style="margin-top: 10px;">
                        <span class="label">Your ${ownershipPct}% Share of Expenses</span>
                        <span class="value" style="font-weight: bold;">$${(totalPropExpenses * ownershipPct / 100).toLocaleString()}</span>
                    </div>
                    ` : ''}
                    ` : '<p class="empty">No expenses recorded for this property</p>'}
                    
                    ${property.hasDepreciationSchedule === 'yes' && property.depreciationScheduleDetails ? `
                    <h3>Depreciation Schedule Details</h3>
                    <div class="summary-row">
                        <span class="label">Building Age</span>
                        <span class="value">${property.buildingAge || 'Not specified'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Building Value</span>
                        <span class="value">${property.buildingValue ? '$' + parseFloat(property.buildingValue).toLocaleString() : 'Not specified'}</span>
                    </div>
                    <div style="margin-top: 10px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <strong style="display: block; margin-bottom: 8px; color: #374151;">Schedule Details:</strong>
                        <pre style="white-space: pre-wrap; font-family: monospace; font-size: 10px; color: #6b7280; margin: 0;">${property.depreciationScheduleDetails}</pre>
                    </div>
                    ` : ''}
                    
                    <div class="total">
                        ${ownershipPct !== 100 ? `
                        <div class="summary-row" style="border: none;">
                            <span class="label">Full Property Net Income</span>
                            <span class="value ${netRentalIncome >= 0 ? '' : 'tax'}">${netRentalIncome >= 0 ? '+' : ''}$${netRentalIncome.toLocaleString()}</span>
                        </div>
                        <div class="summary-row" style="border: none; font-weight: bold;">
                            <span class="label">Your ${ownershipPct}% Share (Claimable)</span>
                            <span class="value ${netRentalIncome >= 0 ? '' : 'tax'}">${netRentalIncome >= 0 ? '+' : ''}$${(netRentalIncome * ownershipPct / 100).toLocaleString()}</span>
                        </div>
                        ` : `
                        <div class="summary-row" style="border: none;">
                            <span class="label">Net Rental Income</span>
                            <span class="value ${netRentalIncome >= 0 ? '' : 'tax'}">${netRentalIncome >= 0 ? '+' : ''}$${netRentalIncome.toLocaleString()}</span>
                        </div>
                        `}
                    </div>
                </div>
            `}).join('') : ''}

                ${includeAccountantNotes && accountantNotes.length > 0 ? `
                <!-- ACCOUNTANT NOTES -->
                <div class="section" style="page-break-before: always;">
                    <h2>Accountant Notes</h2>
                    <p style="color: #6b7280; font-style: italic; margin-bottom: 15px;">Included for discussion with your registered tax agent.</p>
                    ${accountantNotes.map(n => `
                        <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-left: 4px solid ${n.priority === 'high' ? '#ef4444' : n.priority === 'medium' ? '#f59e0b' : '#3b82f6'}; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                                <strong style="font-size: 14px;">${n.title}</strong>
                                <span style="font-size: 10px; padding: 2px 6px; border-radius: 10px; background: #fee2e2; color: #ef4444; text-transform: uppercase;">${n.priority}</span>
                            </div>
                            <p style="margin: 5px 0 0 0; line-height: 1.4;">${n.content || 'No details provided.'}</p>
                            <div style="margin-top: 10px; font-size: 9px; color: #9ca3af;">Status: ${n.isResolved ? 'Resolved' : 'Active'}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                <div class="footer">
                    <p><strong>Disclaimer:</strong> This is an estimate only. Consult a registered tax agent for professional advice.</p>
                    <p>Generated by TaxFlow Australia • ${new Date().toISOString()}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            // Use setTimeout to prevent freezing the main app
            setTimeout(() => {
                printWindow.print();
            }, 100);
        }
    };

    const SectionHeader = ({ title, section, count }: { title: string; section: string; count?: number }) => (
        <button
            onClick={() => toggleSection(section)}
            className="w-full flex items-center justify-between p-3 hover:bg-background-elevated rounded-lg transition-colors"
        >
            <div className="flex items-center gap-2">
                {expandedSections[section] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-medium">{title}</span>
                {count !== undefined && <span className="text-xs text-text-muted">({count} items)</span>}
            </div>
        </button>
    );

    return (
        <DashboardLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Financial Reports</h1>
                    <p className="text-text-secondary">Detailed breakdown for FY {currentFinancialYear}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background-elevated rounded-lg border border-border">
                        <input
                            type="checkbox"
                            id="includeNotes"
                            checked={includeAccountantNotes}
                            onChange={(e) => setIncludeAccountantNotes(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="includeNotes" className="text-sm font-medium text-text-secondary cursor-pointer">
                            Include Notes
                        </label>
                    </div>
                    <Button variant="secondary" onClick={handleExportPDF}>
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Tax Summary Card */}
                <Card>
                    <CardHeader
                        title="Tax Summary"
                        subtitle="Estimated liability breakdown"
                    />
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="h-64 w-full md:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={incomeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {incomeData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, 'Amount']}
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
                                <span className="text-text-secondary">Gross Income</span>
                                <span className="font-semibold text-text-primary">${totalIncome.toNumber().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
                                <span className="text-text-secondary">Total Deductions</span>
                                <span className="font-semibold text-text-primary">-${totalDeductions.toNumber().toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-border my-2"></div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated border border-border">
                                <span className="text-text-secondary">Taxable Income</span>
                                <span className="font-bold text-lg text-text-primary">${estimatedTaxableIncome.toNumber().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-danger/10 border border-danger/20">
                                <span className="text-danger">Est. Tax + Medicare</span>
                                <span className="font-bold text-lg text-danger">${estimatedTaxPayable.plus(medicareLevy).toNumber().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Audit Risk Report */}
                <Card>
                    <CardHeader
                        title="Safety Check Report"
                        subtitle="ATO compliance analysis"
                    />
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg border ${auditRiskLevel === 'high' ? 'bg-danger/10 border-danger/20' :
                            auditRiskLevel === 'medium' ? 'bg-warning/10 border-warning/20' :
                                'bg-success/10 border-success/20'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                {auditRiskLevel === 'low' ? <CheckCircle className="w-6 h-6 text-success" /> : <AlertTriangle className="w-6 h-6" />}
                                <h3 className="font-bold text-lg capitalize">{auditRiskLevel} Audit Risk</h3>
                            </div>
                            <p className="text-sm opacity-90">
                                {auditRiskLevel === 'low' ? 'Your deductions are within expected ranges.' :
                                    auditRiskLevel === 'medium' ? 'Some deductions are higher than average.' :
                                        'Multiple deductions significantly above average.'}
                            </p>
                        </div>

                        <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-background-secondary sticky top-0">
                                    <tr className="text-left text-xs text-text-muted uppercase">
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3 text-right">Claimed</th>
                                        <th className="px-4 py-3 text-right">Benchmark</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safetyCheckItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-text-muted">No deductions analyzed</td>
                                        </tr>
                                    ) : (
                                        safetyCheckItems.map((item, idx) => (
                                            <tr key={idx} className="border-t border-border hover:bg-background-elevated">
                                                <td className="px-4 py-3 capitalize">{item.category.replace('_', ' ')}</td>
                                                <td className="px-4 py-3 text-right font-medium">${item.userAmount.toNumber().toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-text-muted">${item.atoAverage.toNumber().toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(item.status)}`}>
                                                        {item.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Detailed Line Items */}
            <div className="space-y-4">
                {/* Income Details */}
                <Card>
                    <SectionHeader title="Income Details" section="income" count={reportData.incomeRecords.length} />
                    {expandedSections.income && (
                        <div className="border-t border-border">
                            {reportData.incomeRecords.length === 0 ? (
                                <p className="p-4 text-text-muted text-center">No income records entered</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-background-secondary">
                                            <tr className="text-left text-xs text-text-muted uppercase">
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Payer</th>
                                                <th className="px-4 py-3">Category</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                                <th className="px-4 py-3 text-right">Tax Withheld</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.incomeRecords.map((r, idx) => (
                                                <tr key={idx} className="border-t border-border hover:bg-background-elevated">
                                                    <td className="px-4 py-3">{new Date(r.date).toLocaleDateString('en-AU')}</td>
                                                    <td className="px-4 py-3">{r.payer || '-'}</td>
                                                    <td className="px-4 py-3 capitalize">{formatCategory(r.category)}</td>
                                                    <td className="px-4 py-3 text-text-muted">{r.description || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-success">${parseFloat(r.amount).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right text-text-muted">{r.taxWithheld ? `$${parseFloat(r.taxWithheld).toLocaleString()}` : '-'}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-background-elevated font-semibold">
                                                <td colSpan={4} className="px-4 py-3">Total</td>
                                                <td className="px-4 py-3 text-right text-success">${incomeTotal.toNumber().toLocaleString()}</td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* Expense Details */}
                <Card>
                    <SectionHeader title="Work Expenses" section="expenses" count={reportData.receipts.length} />
                    {expandedSections.expenses && (
                        <div className="border-t border-border">
                            {reportData.receipts.length === 0 ? (
                                <p className="p-4 text-text-muted text-center">No expense receipts entered</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-background-secondary">
                                            <tr className="text-left text-xs text-text-muted uppercase">
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Vendor</th>
                                                <th className="px-4 py-3">Category</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.receipts.map((r, idx) => (
                                                <tr key={idx} className="border-t border-border hover:bg-background-elevated">
                                                    <td className="px-4 py-3">{new Date(r.date).toLocaleDateString('en-AU')}</td>
                                                    <td className="px-4 py-3">{r.vendor}</td>
                                                    <td className="px-4 py-3 capitalize">{formatCategory(r.category)}</td>
                                                    <td className="px-4 py-3 text-text-muted">{r.description || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-danger">${parseFloat(r.amount).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-background-elevated font-semibold">
                                                <td colSpan={4} className="px-4 py-3">Total</td>
                                                <td className="px-4 py-3 text-right text-danger">${expenseTotal.toNumber().toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* Asset Depreciation */}
                <Card>
                    <SectionHeader title="Asset Depreciation Schedule" section="assets" count={reportData.assets.length} />
                    {expandedSections.assets && (
                        <div className="border-t border-border">
                            {reportData.assets.length === 0 ? (
                                <p className="p-4 text-text-muted text-center">No depreciable assets entered</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-background-secondary">
                                            <tr className="text-left text-xs text-text-muted uppercase">
                                                <th className="px-4 py-3">Item</th>
                                                <th className="px-4 py-3">Purchase Date</th>
                                                <th className="px-4 py-3 text-right">Cost</th>
                                                <th className="px-4 py-3">Life</th>
                                                <th className="px-4 py-3">Method</th>
                                                <th className="px-4 py-3 text-right">This Year</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.assets.map((a, idx) => {
                                                const annualDep = a.method === 'diminishing_value'
                                                    ? (parseFloat(a.cost) * (2 / a.effectiveLifeYears))
                                                    : (parseFloat(a.cost) / a.effectiveLifeYears);
                                                return (
                                                    <tr key={idx} className="border-t border-border hover:bg-background-elevated">
                                                        <td className="px-4 py-3">{a.itemName}</td>
                                                        <td className="px-4 py-3">{new Date(a.purchaseDate).toLocaleDateString('en-AU')}</td>
                                                        <td className="px-4 py-3 text-right">${parseFloat(a.cost).toLocaleString()}</td>
                                                        <td className="px-4 py-3">{a.effectiveLifeYears}y</td>
                                                        <td className="px-4 py-3 text-xs">{a.method === 'diminishing_value' ? 'Diminishing' : 'Prime Cost'}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-warning">${annualDep.toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
                {/* Accountant Notes */}
                <Card>
                    <SectionHeader title="Accountant Notes" section="notes" count={reportData.accountantNotes.length} />
                    {expandedSections.notes && (
                        <div className="border-t border-border p-4">
                            {reportData.accountantNotes.length === 0 ? (
                                <p className="text-text-muted text-center">No notes entered for this year</p>
                            ) : (
                                <div className="space-y-4">
                                    {reportData.accountantNotes.map((note, idx) => (
                                        <div key={idx} className="p-4 rounded-lg bg-background-elevated border border-border">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-bold text-text-primary">{note.title}</h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${note.priority === 'high' ? 'bg-danger/20 text-danger' :
                                                    note.priority === 'medium' ? 'bg-warning/20 text-warning' :
                                                        'bg-info/20 text-info'
                                                    }`}>
                                                    {note.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-secondary">{note.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>

            <div className="flex items-start gap-2 text-xs text-text-muted mt-6">
                <Info className="w-4 h-4 flex-shrink-0" />
                <p>This report is for informational purposes only. Consult a registered tax agent for professional advice.</p>
            </div>
        </DashboardLayout>
    );
}
