import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Building2,
    TrendingUp,
    DollarSign,
    Wrench,
    ExternalLink,
    Trash2,
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { DashboardLayout } from '../components/layout';
import { Card, CardHeader, Button, StatCard, Input, ConfirmDialog } from '../components/ui';
import { db } from '../database/db';
import { PropertyDepreciationHelper } from '../components/helpers/PropertyDepreciationHelper';
import type { Property, PropertyIncome, PropertyExpense, PropertyLoan } from '../types';

type PropertyTab = 'income' | 'expenses' | 'maintenance' | 'depreciation' | 'loans' | 'purchase';

export function PropertyPortfolio() {
    const { initialize, isInitialized, currentFinancialYear, refreshDashboard } = useTaxFlowStore();
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [activeTab, setActiveTab] = useState<PropertyTab>('income');
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const [showArchived, setShowArchived] = useState(false);

    // Income state
    const [propertyIncome, setPropertyIncome] = useState<PropertyIncome | null>(null);
    const [incomeForm, setIncomeForm] = useState({
        grossRent: '',
        insurancePayouts: '',
        otherIncome: '',
    });

    // Expenses state
    const [propertyExpenses, setPropertyExpenses] = useState<PropertyExpense[]>([]);

    // Add Expense state
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        date: '',
        category: 'management_fees',
        description: '',
        amount: '',
    });

    // Add Property state
    const [showAddProperty, setShowAddProperty] = useState(false);
    const [newPropertyForm, setNewPropertyForm] = useState<{
        address: string;
        suburb: string;
        state: string;
        postcode: string;
        propertyType: 'house' | 'unit' | 'townhouse' | 'commercial';
    }>({
        address: '',
        suburb: '',
        state: 'NSW',
        postcode: '',
        propertyType: 'house',
    });

    // Maintenance form state  
    const [maintenanceRecords, setMaintenanceRecords] = useState<PropertyExpense[]>([]);
    const [maintenanceForm, setMaintenanceForm] = useState({
        date: '',
        description: '',
        amount: '',
        isCapitalImprovement: false,
    });

    // Cost base form state
    const [costBaseForm, setCostBaseForm] = useState({
        category: 'purchase_price' as 'purchase_price' | 'stamp_duty' | 'legal_fees' | 'buyers_agent' | 'building_inspection' | 'other',
        description: '',
        amount: '',
        date: '',
    });

    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null; address: string }>({
        isOpen: false, id: null, address: ''
    });

    // Loans state
    const [propertyLoans, setPropertyLoans] = useState<PropertyLoan[]>([]);
    const [loanForm, setLoanForm] = useState({
        lender: '',
        accountNumber: '',
        loanStartDate: '',
        originalPrincipal: '',
        currentBalance: '',
        interestRatePAPercent: '',
        repaymentType: 'principal_and_interest' as 'interest_only' | 'principal_and_interest',
        annualInterestPaid: '',
    });

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Load properties from database
    useEffect(() => {
        const loadProperties = async () => {
            try {
                const dbProperties = await db.properties
                    .where('financialYear')
                    .equals(currentFinancialYear)
                    .toArray();

                setProperties(dbProperties);

                // Select first property by default
                if (dbProperties.length > 0 && !selectedProperty) {
                    setSelectedProperty(dbProperties[0]);
                }
            } catch (error) {
                console.error('Failed to load properties:', error);
            }
        };

        if (currentFinancialYear) {
            loadProperties();
        }
    }, [currentFinancialYear, selectedProperty]);

    // Load income and expenses when property is selected
    const loadPropertyData = async () => {
        if (!selectedProperty?.id) return;

        try {
            // Load income
            const income = await db.propertyIncome
                .where({ propertyId: selectedProperty.id, financialYear: currentFinancialYear })
                .first();

            if (income) {
                setPropertyIncome(income);
                setIncomeForm({
                    grossRent: income.grossRent || '',
                    insurancePayouts: income.insurancePayouts || '',
                    otherIncome: income.otherIncome || '',
                });
            } else {
                setPropertyIncome(null);
                setIncomeForm({ grossRent: '', insurancePayouts: '', otherIncome: '' });
            }

            // Load expenses (non-maintenance)
            const allExpenses = await db.propertyExpenses
                .where({ propertyId: selectedProperty.id, financialYear: currentFinancialYear })
                .toArray();

            // Split into maintenance (repairs/improvements) and regular expenses
            const maintenance = allExpenses.filter(e => e.category === 'repairs' || e.category === 'capital_improvement');
            const regularExpenses = allExpenses.filter(e => e.category !== 'repairs' && e.category !== 'capital_improvement');

            setPropertyExpenses(regularExpenses);
            setMaintenanceRecords(maintenance);

            // Load loans
            const loans = await db.propertyLoans
                .where({ propertyId: selectedProperty.id, financialYear: currentFinancialYear })
                .toArray();
            setPropertyLoans(loans);
        } catch (error) {
            console.error('Failed to load property data:', error);
        }
    };

    useEffect(() => {
        loadPropertyData();
    }, [selectedProperty, currentFinancialYear]);

    const tabs: { id: PropertyTab; label: string; count?: number }[] = [
        { id: 'income', label: 'Income' },
        { id: 'expenses', label: 'Recurrent Expenses', count: propertyExpenses.length },
        { id: 'maintenance', label: 'Maintenance Log', count: maintenanceRecords.length },
        { id: 'depreciation', label: 'Depreciation' },
        { id: 'loans', label: 'Loans', count: propertyLoans.length },
        { id: 'purchase', label: 'Purchase Data' },
    ];



    // State for editing property
    const [isEditing, setIsEditing] = useState(false);



    // Handle Edit Property Click
    const handleEditProperty = () => {
        if (!selectedProperty) return;
        setNewPropertyForm({
            address: selectedProperty.address,
            suburb: selectedProperty.suburb,
            state: selectedProperty.state as any,
            postcode: selectedProperty.postcode,
            propertyType: selectedProperty.propertyType,
        });
        setIsEditing(true);
        setShowAddProperty(true);
    };

    // Add or Update property
    const handleSaveProperty = async () => {
        if (!newPropertyForm.address.trim()) return;

        if (isEditing && selectedProperty) {
            // Update existing
            await db.properties.update(selectedProperty.id, {
                address: newPropertyForm.address,
                suburb: newPropertyForm.suburb,
                state: newPropertyForm.state,
                postcode: newPropertyForm.postcode,
                propertyType: newPropertyForm.propertyType,
                updatedAt: new Date(),
            });

            // Reload sidebar list
            const updated = await db.properties.get(selectedProperty.id);
            if (updated) {
                setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedProperty(updated);
            }
        } else {
            // Create new
            const newProperty = {
                financialYear: currentFinancialYear,
                address: newPropertyForm.address,
                suburb: newPropertyForm.suburb,
                state: newPropertyForm.state,
                postcode: newPropertyForm.postcode,
                propertyType: newPropertyForm.propertyType,
                ownershipSplit: [{ ownerName: 'Owner', percentage: 100 }],
                purchaseDate: new Date(),
                status: 'active' as const,
                costBase: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const id = await db.properties.add(newProperty);
            const addedProperty = await db.properties.get(id);
            if (addedProperty) {
                setProperties(prev => [...prev, addedProperty]);
                setSelectedProperty(addedProperty);
            }
        }

        // Reset form
        setShowAddProperty(false);
        setIsEditing(false);
        setNewPropertyForm({
            address: '',
            suburb: '',
            state: 'NSW',
            postcode: '',
            propertyType: 'house',
        });
    };



    const handleArchiveProperty = async () => {
        if (!selectedProperty?.id) return;
        const newStatus = selectedProperty.status === 'active' ? 'inactive' : 'active';
        await db.properties.update(selectedProperty.id, {
            status: newStatus,
            updatedAt: new Date()
        });

        // Update state logic
        const updated = await db.properties.get(selectedProperty.id);
        if (updated) {
            setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedProperty(updated);
        }
    };

    // Delete property
    const handleDeletePropertyRequest = () => {
        if (!selectedProperty) return;
        setDeleteConfirm({
            isOpen: true,
            id: selectedProperty.id || null,
            address: selectedProperty.address
        });
    };

    const confirmDeleteProperty = async () => {
        if (deleteConfirm.id) {
            await db.properties.delete(deleteConfirm.id);
            const remaining = properties.filter(p => p.id !== deleteConfirm.id);
            setProperties(remaining);
            setSelectedProperty(remaining.length > 0 ? remaining[0] : null);
        }
        setDeleteConfirm({ isOpen: false, id: null, address: '' });
    };

    // Save income to database
    const handleSaveIncome = async () => {
        if (!selectedProperty?.id) return;

        const incomeData = {
            propertyId: selectedProperty.id,
            financialYear: currentFinancialYear,
            grossRent: incomeForm.grossRent,
            insurancePayouts: incomeForm.insurancePayouts,
            otherIncome: incomeForm.otherIncome,
            updatedAt: new Date(),
        };

        if (propertyIncome?.id) {
            await db.propertyIncome.update(propertyIncome.id, incomeData);
        } else {
            await db.propertyIncome.add({
                ...incomeData,
                createdAt: new Date(),
            });
        }

        // Reload property income
        const updated = await db.propertyIncome
            .where({ propertyId: selectedProperty.id, financialYear: currentFinancialYear })
            .first();
        if (updated) setPropertyIncome(updated);

        // Refresh dashboard to reflect new income
        await refreshDashboard();
    };

    // Calculate total income
    const totalIncome = parseFloat(incomeForm.grossRent || '0') +
        parseFloat(incomeForm.insurancePayouts || '0') +
        parseFloat(incomeForm.otherIncome || '0');

    // Calculate total expenses
    const totalExpenses = propertyExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);



    // Add maintenance record to database
    const handleAddMaintenance = async () => {
        if (!selectedProperty?.id || !maintenanceForm.description.trim() || !maintenanceForm.amount) return;

        const maintenanceRecord: Omit<PropertyExpense, 'id'> = {
            propertyId: selectedProperty.id,
            financialYear: currentFinancialYear,
            category: maintenanceForm.isCapitalImprovement ? 'capital_improvement' : 'repairs',
            amount: maintenanceForm.amount,
            description: maintenanceForm.description,
            isCapitalImprovement: maintenanceForm.isCapitalImprovement,
            date: maintenanceForm.date ? new Date(maintenanceForm.date) : new Date(),
            createdAt: new Date(),
        };

        await db.propertyExpenses.add(maintenanceRecord);

        // Reload maintenance records
        const allExpenses = await db.propertyExpenses
            .where({ propertyId: selectedProperty.id, financialYear: currentFinancialYear })
            .toArray();
        const maintenance = allExpenses.filter(e => e.category === 'repairs' || e.category === 'capital_improvement');
        setMaintenanceRecords(maintenance);

        // Reset form
        setMaintenanceForm({
            date: '',
            description: '',
            amount: '',
            isCapitalImprovement: false,
        });
    };

    // Add Recurrent Expense
    const handleAddExpense = async () => {
        if (!selectedProperty?.id || !expenseForm.amount || !expenseForm.date) return;

        try {
            await db.propertyExpenses.add({
                propertyId: selectedProperty.id,
                financialYear: currentFinancialYear,
                date: new Date(expenseForm.date),
                category: expenseForm.category as any,
                description: expenseForm.description,
                amount: expenseForm.amount,
                isCapitalImprovement: false,
                createdAt: new Date(),
            });

            // Reset form
            setExpenseForm({
                date: '',
                category: 'management_fees',
                description: '',
                amount: '',
            });
            setShowAddExpense(false);

            // Reload
            loadPropertyData();
            // Also refresh overall dashboard stats
            refreshDashboard();
        } catch (error) {
            console.error('Failed to add expense:', error);
        }
    };

    // Calculate total maintenance
    const totalMaintenance = maintenanceRecords.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);

    // Calculate total cost base
    const totalCostBase = selectedProperty?.costBase?.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0) || 0;

    // Add cost base item to property
    const handleAddCostBase = async () => {
        if (!selectedProperty?.id || !costBaseForm.amount) return;

        const newCostBaseItem = {
            category: costBaseForm.category,
            description: costBaseForm.description || getCostBaseLabel(costBaseForm.category),
            amount: costBaseForm.amount,
            date: costBaseForm.date ? new Date(costBaseForm.date) : new Date(),
        };

        // Update property with new cost base item
        const updatedCostBase = [...(selectedProperty.costBase || []), newCostBaseItem];
        await db.properties.update(selectedProperty.id, {
            costBase: updatedCostBase,
            updatedAt: new Date(),
        });

        // Reload property
        const updated = await db.properties.get(selectedProperty.id);
        if (updated) {
            setSelectedProperty(updated);
            setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
        }

        // Reset form
        setCostBaseForm({
            category: 'purchase_price',
            description: '',
            amount: '',
            date: '',
        });
    };

    const handleDeleteCostBase = async (indexToDelete: number) => {
        if (!selectedProperty?.id || !selectedProperty.costBase) return;

        // Remove item at index
        const updatedCostBase = selectedProperty.costBase.filter((_, index) => index !== indexToDelete);

        await db.properties.update(selectedProperty.id, {
            costBase: updatedCostBase,
            updatedAt: new Date(),
        });

        // Reload property
        const updated = await db.properties.get(selectedProperty.id);
        if (updated) {
            setSelectedProperty(updated);
            setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
        }
    };

    const getCostBaseLabel = (category: string) => {
        const labels: Record<string, string> = {
            purchase_price: 'Purchase Price',
            stamp_duty: 'Stamp Duty',
            legal_fees: 'Legal Fees',
            buyers_agent: 'Buyers Agent',
            building_inspection: 'Building Inspection',
            other: 'Other',
        };
        return labels[category] || category;
    };

    // Add loan to database
    const handleAddLoan = async () => {
        if (!selectedProperty?.id || !loanForm.lender || !loanForm.annualInterestPaid) return;

        const newLoan: PropertyLoan = {
            propertyId: selectedProperty.id,
            financialYear: currentFinancialYear,
            lender: loanForm.lender,
            accountNumber: loanForm.accountNumber || undefined,
            loanStartDate: loanForm.loanStartDate ? new Date(loanForm.loanStartDate) : new Date(),
            originalPrincipal: loanForm.originalPrincipal || '0',
            currentBalance: loanForm.currentBalance || '0',
            interestRatePAPercent: loanForm.interestRatePAPercent || '0',
            repaymentType: loanForm.repaymentType,
            annualInterestPaid: loanForm.annualInterestPaid,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.propertyLoans.add(newLoan);

        // Reload loans
        const loans = await db.propertyLoans
            .where({ propertyId: selectedProperty.id, financialYear: currentFinancialYear })
            .toArray();
        setPropertyLoans(loans);

        // Reset form
        setLoanForm({
            lender: '',
            accountNumber: '',
            loanStartDate: '',
            originalPrincipal: '',
            currentBalance: '',
            interestRatePAPercent: '',
            repaymentType: 'principal_and_interest',
            annualInterestPaid: '',
        });

        // Refresh dashboard to update tax calculations
        refreshDashboard();
    };

    // Delete loan from database
    const handleDeleteLoan = async (loanId: number) => {
        if (!selectedProperty?.id) return;

        await db.propertyLoans.delete(loanId);

        // Reload loans
        const loans = await db.propertyLoans
            .where({ propertyId: selectedProperty.id, financialYear: currentFinancialYear })
            .toArray();
        setPropertyLoans(loans);

        refreshDashboard();
    };

    return (
        <DashboardLayout>
            <div className="flex gap-6 h-[calc(100vh-7rem)]">
                {/* Property List Sidebar */}
                <div className="w-72 flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-text-primary">Your Properties</h2>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="p-2 text-xs"
                                onClick={() => setShowArchived(!showArchived)}
                                title={showArchived ? "Hide Archived" : "Show Archived"}
                            >
                                <Building2 className={`w-4 h-4 ${showArchived ? 'text-accent' : 'text-text-muted'}`} />
                            </Button>
                            <Button size="sm" className="p-2" onClick={() => setShowAddProperty(!showAddProperty)}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Add/Edit Property Form */}
                    {showAddProperty && (
                        <Card className="mb-4 p-3">
                            <h3 className="font-medium text-sm mb-3">{isEditing ? 'Edit Property' : 'Add New Property'}</h3>
                            <div className="space-y-2">
                                <div className="flex gap-2 mb-2">
                                    <select
                                        value={newPropertyForm.propertyType}
                                        onChange={(e) => setNewPropertyForm(prev => ({ ...prev, propertyType: e.target.value as any }))}
                                        className="w-1/3 px-2 py-2 rounded-lg bg-background-elevated border border-border text-text-primary text-sm"
                                    >
                                        <option value="house">House</option>
                                        <option value="unit">Unit</option>
                                        <option value="townhouse">Townhouse</option>
                                        <option value="commercial">Commercial</option>
                                    </select>
                                    <Input
                                        placeholder="Street address"
                                        value={newPropertyForm.address}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setNewPropertyForm(prev => ({ ...prev, address: e.target.value }))
                                        }
                                        className="flex-1"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Suburb"
                                        value={newPropertyForm.suburb}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setNewPropertyForm(prev => ({ ...prev, suburb: e.target.value }))
                                        }
                                        className="flex-1"
                                    />
                                    <select
                                        value={newPropertyForm.state}
                                        onChange={(e) => setNewPropertyForm(prev => ({ ...prev, state: e.target.value }))}
                                        className="px-2 py-2 rounded-lg bg-background-elevated border border-border text-text-primary text-sm"
                                    >
                                        <option value="NSW">NSW</option>
                                        <option value="VIC">VIC</option>
                                        <option value="QLD">QLD</option>
                                        <option value="WA">WA</option>
                                        <option value="SA">SA</option>
                                        <option value="TAS">TAS</option>
                                        <option value="ACT">ACT</option>
                                        <option value="NT">NT</option>
                                    </select>
                                    <Input
                                        placeholder="Postcode"
                                        value={newPropertyForm.postcode}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setNewPropertyForm(prev => ({ ...prev, postcode: e.target.value }))
                                        }
                                        className="w-20"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveProperty} className="flex-1">
                                        {isEditing ? 'Save Changes' : 'Add Property'}
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => { setShowAddProperty(false); setIsEditing(false); }}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Search */}
                    <div className="mb-4">
                        <Input
                            placeholder="Search address..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>

                    {/* Property Cards */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {properties
                            .filter(p => showArchived ? true : p.status !== 'inactive')
                            .map((property) => {
                                // Calculate approximate yield for list view
                                // Note: This is an estimation as we don't load full income/expenses for all properties here for performance
                                // In a real app we'd query this efficiently. For now, we show a placeholder or basic stat.
                                const isSelected = selectedProperty?.id === property.id;

                                return (
                                    <button
                                        key={property.id}
                                        onClick={() => setSelectedProperty(property)}
                                        className={`w-full p-3 rounded-lg text-left transition-colors ${isSelected
                                            ? 'bg-accent/20 border border-accent'
                                            : 'bg-background-card border border-border-muted hover:border-primary'
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-background-elevated flex items-center justify-center overflow-hidden">
                                                {property.imageUrl ? (
                                                    <img
                                                        src={property.imageUrl}
                                                        alt={property.address}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Building2 className="w-6 h-6 text-text-muted" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-text-primary truncate">{property.address}</p>
                                                <p className="text-xs text-text-muted truncate">
                                                    {property.suburb} {property.state} {property.postcode}
                                                </p>
                                                <div className="text-xs font-medium mt-1 text-text-secondary">
                                                    {property.status.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Property Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedProperty ? (
                        <>
                            {/* Property Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex gap-4">
                                    {/* Property Image */}
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-lg bg-background-elevated flex items-center justify-center overflow-hidden border-2 border-border">
                                            {selectedProperty.imageUrl ? (
                                                <img
                                                    src={selectedProperty.imageUrl}
                                                    alt={selectedProperty.address}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Building2 className="w-10 h-10 text-text-muted" />
                                            )}
                                        </div>
                                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xs font-medium">
                                                {selectedProperty.imageUrl ? 'Change' : 'Add Photo'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file || !selectedProperty?.id) return;

                                                    // Compress and convert to base64
                                                    const reader = new FileReader();
                                                    reader.onload = async (event) => {
                                                        const img = new Image();
                                                        img.onload = async () => {
                                                            // Create canvas and resize
                                                            const canvas = document.createElement('canvas');
                                                            const maxSize = 400;
                                                            let width = img.width;
                                                            let height = img.height;

                                                            if (width > height) {
                                                                if (width > maxSize) {
                                                                    height *= maxSize / width;
                                                                    width = maxSize;
                                                                }
                                                            } else {
                                                                if (height > maxSize) {
                                                                    width *= maxSize / height;
                                                                    height = maxSize;
                                                                }
                                                            }

                                                            canvas.width = width;
                                                            canvas.height = height;
                                                            const ctx = canvas.getContext('2d');
                                                            ctx?.drawImage(img, 0, 0, width, height);

                                                            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

                                                            await db.properties.update(selectedProperty.id!, {
                                                                imageUrl: compressedDataUrl,
                                                                updatedAt: new Date(),
                                                            });

                                                            const updated = await db.properties.get(selectedProperty.id!);
                                                            if (updated) {
                                                                setSelectedProperty(updated);
                                                                setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
                                                            }
                                                        };
                                                        img.src = event.target?.result as string;
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                        </label>
                                    </div>
                                    {/* Property Info */}
                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
                                            <span>🏠</span>
                                            <span>/ Portfolio / {selectedProperty.address}</span>
                                        </div>
                                        <h1 className="text-2xl font-bold text-text-primary">
                                            {selectedProperty.address}, {selectedProperty.suburb}
                                        </h1>
                                        <p className="text-text-secondary">
                                            {selectedProperty.state} {selectedProperty.postcode}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                                            <span>Ownership: <span className="text-text-primary font-medium">{selectedProperty.ownershipSplit[0]?.percentage}%</span></span>
                                            <span>Purchased: <span className="text-text-primary font-medium">{selectedProperty.purchaseDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                                            <span>Cost Base: <span className="text-text-primary font-medium">
                                                {(() => {
                                                    const totalCostBase = selectedProperty.costBase?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;
                                                    return `$${totalCostBase.toLocaleString('en-AU')}`;
                                                })()}
                                            </span></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedProperty.status === 'active' ? 'bg-success/20 text-success' : 'bg-text-muted/20 text-text-muted'
                                        }`}>
                                        {selectedProperty.status.toUpperCase()}
                                    </span>
                                    <Button variant="secondary" size="sm" onClick={handleArchiveProperty}>
                                        {selectedProperty.status === 'active' ? 'Archive' : 'Activate'}
                                    </Button>
                                    <Button size="sm" onClick={handleEditProperty}>
                                        Edit Details
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-danger border-danger/30 hover:bg-danger/10"
                                        onClick={handleDeletePropertyRequest}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Stats Row */}
                            {(() => {
                                // Get ownership percentage
                                const ownershipPercent = selectedProperty.ownershipSplit?.[0]?.percentage ?? 100;
                                const ownershipFraction = ownershipPercent / 100;

                                // Calculate real-time stats (full property amounts)
                                const grossIncomeFull = propertyIncome ? (
                                    (parseFloat(propertyIncome.grossRent) || 0) +
                                    (parseFloat(propertyIncome.insurancePayouts) || 0) +
                                    (parseFloat(propertyIncome.otherIncome) || 0)
                                ) : 0;

                                const operatingExpensesFull = propertyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                const maintenanceExpensesFull = maintenanceRecords.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                const totalExpensesFull = operatingExpensesFull + maintenanceExpensesFull;

                                // Apply ownership split for claimable amounts
                                const grossIncome = grossIncomeFull * ownershipFraction;
                                const totalExpenses = totalExpensesFull * ownershipFraction;
                                const maintenanceExpenses = maintenanceExpensesFull * ownershipFraction;

                                // Cost base calculation (your share)
                                const costBaseFull = selectedProperty.costBase?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;
                                const costBase = costBaseFull * ownershipFraction;

                                const netYield = costBase > 0 ? ((grossIncome - totalExpenses) / costBase) * 100 : 0;

                                const shareLabel = ownershipPercent < 100 ? `Your ${ownershipPercent}% share` : undefined;

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <StatCard
                                            title="NET YIELD (YTD)"
                                            value={`${netYield.toFixed(1)}%`}
                                            trend={{ value: 0 }} // Dynamic trend requires history
                                            subtitle={costBase > 0 ? (shareLabel || "Based on cost base") : "Add cost base data"}
                                            icon={<TrendingUp className="w-5 h-5 text-success" />}
                                            iconBgColor="bg-success/20"
                                        />
                                        <StatCard
                                            title="GROSS INCOME (YTD)"
                                            value={`$${grossIncome.toLocaleString('en-AU')}`}
                                            subtitle={shareLabel}
                                            icon={<DollarSign className="w-5 h-5 text-accent" />}
                                            iconBgColor="bg-accent/20"
                                        />
                                        <StatCard
                                            title="TOTAL EXPENSES (YTD)"
                                            value={`$${totalExpenses.toLocaleString('en-AU')}`}
                                            subtitle={shareLabel}
                                            icon={<DollarSign className="w-5 h-5 text-warning" />}
                                            iconBgColor="bg-warning/20"
                                        />
                                        <StatCard
                                            title="MAINTENANCE (YTD)"
                                            value={`$${maintenanceExpenses.toLocaleString('en-AU')}`}
                                            subtitle={shareLabel || (maintenanceExpenses > 1000 ? "Review for capital works" : "Normal range")}
                                            icon={<Wrench className="w-5 h-5 text-danger" />}
                                            iconBgColor="bg-danger/20"
                                        />
                                    </div>
                                );
                            })()}

                            {/* Tabs */}
                            <div className="flex gap-1 border-b border-border-muted mb-6">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                            ? 'text-accent border-accent'
                                            : 'text-text-secondary border-transparent hover:text-text-primary'
                                            }`}
                                    >
                                        {tab.label}
                                        {tab.count !== undefined && (
                                            <span className="px-1.5 py-0.5 rounded bg-background-elevated text-xs">
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto">
                                {activeTab === 'maintenance' && (
                                    <Card>
                                        <CardHeader
                                            title="Add Maintenance Record"
                                            subtitle="Correctly classifying expenses is critical for ATO compliance. Repairs are immediately deductible, while Capital Improvements must be depreciated over time (2.5% p.a.)."
                                            action={
                                                <a
                                                    href="https://www.ato.gov.au/individuals-and-families/investments-and-assets/residential-rental-properties/rental-expenses-to-claim/rental-expenses-you-can-claim-now"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                                >
                                                    ATO Guide: Repairs vs Improvements
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            }
                                        />

                                        {/* Add Form */}
                                        <div className="grid grid-cols-5 gap-4 mb-6">
                                            <Input
                                                label="DATE"
                                                type="date"
                                                value={maintenanceForm.date}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setMaintenanceForm(prev => ({ ...prev, date: e.target.value }))
                                                }
                                            />
                                            <Input
                                                label="DESCRIPTION"
                                                placeholder="e.g. Replace hot water sys"
                                                className="col-span-2"
                                                value={maintenanceForm.description}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))
                                                }
                                            />
                                            <Input
                                                label="COST (AUD)"
                                                type="number"
                                                placeholder="0.00"
                                                leftIcon={<span className="text-text-muted">$</span>}
                                                value={maintenanceForm.amount}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setMaintenanceForm(prev => ({ ...prev, amount: e.target.value }))
                                                }
                                            />
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-text-muted mb-1.5">CLASSIFICATION</label>
                                                    <select
                                                        className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                                                        value={maintenanceForm.isCapitalImprovement ? 'capital' : 'repair'}
                                                        onChange={(e) =>
                                                            setMaintenanceForm(prev => ({ ...prev, isCapitalImprovement: e.target.value === 'capital' }))
                                                        }
                                                    >
                                                        <option value="repair">Repair (Deductible)</option>
                                                        <option value="capital">Improvement (Capital)</option>
                                                    </select>
                                                </div>
                                                <Button className="flex-shrink-0" onClick={handleAddMaintenance}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Filters */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-elevated">
                                                <span className="text-sm text-text-secondary">📅 FY {currentFinancialYear}</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-elevated">
                                                <span className="text-sm text-text-secondary">All Types</span>
                                            </div>
                                            <span className="text-sm text-text-muted ml-auto">
                                                Showing {maintenanceRecords.length} record{maintenanceRecords.length !== 1 ? 's' : ''} • Total: ${totalMaintenance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Maintenance Table */}
                                        <div className="border border-border rounded-lg overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-background-secondary">
                                                    <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                                        <th className="px-4 py-3">Date</th>
                                                        <th className="px-4 py-3">Description</th>
                                                        <th className="px-4 py-3">Contractor</th>
                                                        <th className="px-4 py-3">Classification</th>
                                                        <th className="px-4 py-3 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {maintenanceRecords.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                                                                No maintenance records yet
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        maintenanceRecords.map((record) => (
                                                            <tr key={record.id} className="border-t border-border hover:bg-background-elevated">
                                                                <td className="px-4 py-3 text-text-secondary">
                                                                    {new Date(record.date).toLocaleDateString('en-AU')}
                                                                </td>
                                                                <td className="px-4 py-3 text-text-primary">{record.description}</td>
                                                                <td className="px-4 py-3 text-text-secondary">{record.contractor || '-'}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2 py-1 rounded text-xs ${record.isCapitalImprovement
                                                                        ? 'bg-warning/20 text-warning'
                                                                        : 'bg-success/20 text-success'
                                                                        }`}>
                                                                        {record.isCapitalImprovement ? 'Capital' : 'Repair'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-medium">
                                                                    ${parseFloat(record.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                )}

                                {activeTab === 'income' && (
                                    <Card>
                                        <CardHeader
                                            title="Rental Income"
                                            subtitle={`Total income for FY ${currentFinancialYear}`}
                                        />
                                        <div className="grid grid-cols-3 gap-6 mb-6">
                                            <Input
                                                label="GROSS RENT"
                                                type="number"
                                                placeholder="0.00"
                                                value={incomeForm.grossRent}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setIncomeForm(prev => ({ ...prev, grossRent: e.target.value }))
                                                }
                                                leftIcon={<span className="text-text-muted">$</span>}
                                                hint="Total rent received for the year"
                                            />
                                            <Input
                                                label="INSURANCE PAYOUTS"
                                                type="number"
                                                placeholder="0.00"
                                                value={incomeForm.insurancePayouts}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setIncomeForm(prev => ({ ...prev, insurancePayouts: e.target.value }))
                                                }
                                                leftIcon={<span className="text-text-muted">$</span>}
                                                hint="Insurance claims received"
                                            />
                                            <Input
                                                label="OTHER INCOME"
                                                type="number"
                                                placeholder="0.00"
                                                value={incomeForm.otherIncome}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setIncomeForm(prev => ({ ...prev, otherIncome: e.target.value }))
                                                }
                                                leftIcon={<span className="text-text-muted">$</span>}
                                                hint="Bond retained, lease break fees, etc."
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-border">
                                            <div>
                                                <span className="text-text-secondary">Total Income: </span>
                                                <span className="text-xl font-bold text-success">
                                                    ${totalIncome.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <Button onClick={handleSaveIncome}>
                                                Save Income
                                            </Button>
                                        </div>
                                    </Card>
                                )}

                                {activeTab === 'expenses' && (
                                    <Card>
                                        <CardHeader
                                            title="Recurrent Expenses"
                                            subtitle="Deductible property expenses (excluding maintenance)"
                                        />

                                        {propertyExpenses.length === 0 ? (
                                            <div className="text-center py-12">
                                                <DollarSign className="w-12 h-12 text-text-muted mx-auto mb-4" />
                                                <p className="text-text-secondary mb-4">No expenses recorded yet</p>
                                                <Button variant="secondary" onClick={() => setShowAddExpense(true)}>
                                                    <Plus className="w-4 h-4" />
                                                    Add Expense
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Add Expense Form */}
                                                {showAddExpense && (
                                                    <div className="mb-6 p-4 bg-background-elevated rounded-lg border border-border">
                                                        <h4 className="font-medium text-sm mb-3">New Expense</h4>
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <Input
                                                                label="DATE"
                                                                type="date"
                                                                value={expenseForm.date}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                                                            />
                                                            <div>
                                                                <label className="block text-xs text-text-muted mb-1.5">CATEGORY</label>
                                                                <select
                                                                    className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                                                                    value={expenseForm.category}
                                                                    onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                                                                >
                                                                    <option value="management_fees">Management Fees</option>
                                                                    <option value="council_rates">Council Rates</option>
                                                                    <option value="water_rates">Water Rates</option>
                                                                    <option value="strata_fees">Strata / Body Corp</option>
                                                                    <option value="insurance">Insurance</option>
                                                                    <option value="interest">Loan Interest</option>
                                                                    <option value="land_tax">Land Tax</option>
                                                                    <option value="sundry">Sundry / Other</option>
                                                                </select>
                                                            </div>
                                                            <Input
                                                                label="DESCRIPTION"
                                                                placeholder="Description"
                                                                value={expenseForm.description}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                                                            />
                                                            <Input
                                                                label="AMOUNT"
                                                                type="number"
                                                                placeholder="0.00"
                                                                leftIcon={<span className="text-text-muted">$</span>}
                                                                value={expenseForm.amount}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="secondary" size="sm" onClick={() => setShowAddExpense(false)}>Cancel</Button>
                                                            <Button size="sm" onClick={handleAddExpense}>Save Expense</Button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="border border-border rounded-lg overflow-hidden mb-4">
                                                    <table className="w-full">
                                                        <thead className="bg-background-secondary">
                                                            <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                                                <th className="px-4 py-3">Date</th>
                                                                <th className="px-4 py-3">Category</th>
                                                                <th className="px-4 py-3">Description</th>
                                                                <th className="px-4 py-3 text-right">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {propertyExpenses.map((expense) => (
                                                                <tr key={expense.id} className="border-t border-border hover:bg-background-elevated">
                                                                    <td className="px-4 py-3 text-text-secondary">
                                                                        {new Date(expense.date).toLocaleDateString('en-AU')}
                                                                    </td>
                                                                    <td className="px-4 py-3 capitalize">{expense.category.replace('_', ' ')}</td>
                                                                    <td className="px-4 py-3 text-text-primary">{expense.description}</td>
                                                                    <td className="px-4 py-3 text-right font-medium">
                                                                        ${parseFloat(expense.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-text-secondary">
                                                        Total Expenses: <span className="font-bold text-warning">${totalExpenses.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
                                                    </span>
                                                    <Button variant="secondary">
                                                        <Plus className="w-4 h-4" />
                                                        Add Expense
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </Card>
                                )}

                                {activeTab === 'purchase' && (
                                    <Card>
                                        <CardHeader
                                            title="Purchase Data & Cost Base"
                                            subtitle="Capital costs that form the cost base for CGT calculations when you sell"
                                        />

                                        {/* Purchase Summary */}
                                        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-background-elevated rounded-lg">
                                            <div>
                                                <label className="block text-xs text-text-muted uppercase mb-1.5">Purchase Date</label>
                                                <input
                                                    type="date"
                                                    defaultValue={(() => {
                                                        if (!selectedProperty?.purchaseDate) return '';
                                                        try {
                                                            const date = new Date(selectedProperty.purchaseDate);
                                                            if (isNaN(date.getTime())) return '';
                                                            return date.toISOString().split('T')[0];
                                                        } catch {
                                                            return '';
                                                        }
                                                    })()}
                                                    key={selectedProperty?.id} // Reset input when property changes
                                                    onBlur={async (e) => {
                                                        if (!selectedProperty?.id || !e.target.value) return;
                                                        const newDate = new Date(e.target.value);
                                                        if (isNaN(newDate.getTime())) return;
                                                        await db.properties.update(selectedProperty.id, {
                                                            purchaseDate: newDate,
                                                            updatedAt: new Date(),
                                                        });
                                                        const updated = await db.properties.get(selectedProperty.id);
                                                        if (updated) {
                                                            setSelectedProperty(updated);
                                                            setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 rounded-lg bg-background-card border border-border text-text-primary text-lg font-semibold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-text-muted uppercase mb-1.5">Your Ownership %</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={selectedProperty?.ownershipSplit?.[0]?.percentage ?? 100}
                                                        onChange={async (e) => {
                                                            if (!selectedProperty?.id) return;
                                                            const percentage = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            const updatedOwnership = [{
                                                                ownerName: selectedProperty.ownershipSplit?.[0]?.ownerName || 'Owner',
                                                                percentage
                                                            }];
                                                            await db.properties.update(selectedProperty.id, {
                                                                ownershipSplit: updatedOwnership,
                                                                updatedAt: new Date(),
                                                            });
                                                            const updated = await db.properties.get(selectedProperty.id);
                                                            if (updated) {
                                                                setSelectedProperty(updated);
                                                                setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
                                                            }
                                                        }}
                                                        className="w-full px-3 py-2 rounded-lg bg-background-card border border-border text-text-primary text-lg font-semibold"
                                                    />
                                                    <span className="text-lg font-semibold text-text-muted">%</span>
                                                </div>
                                                <p className="text-xs text-text-muted mt-1">For joint ownership properties</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-text-muted uppercase">Total Cost Base</span>
                                                <p className="text-lg font-semibold text-accent mt-1.5">
                                                    ${totalCostBase.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Add Cost Base Item Form */}
                                        <div className="grid grid-cols-5 gap-4 mb-6">
                                            <div>
                                                <label className="block text-xs text-text-muted mb-1.5">CATEGORY</label>
                                                <select
                                                    value={costBaseForm.category}
                                                    onChange={(e) => setCostBaseForm(prev => ({ ...prev, category: e.target.value as typeof costBaseForm.category }))}
                                                    className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                                                >
                                                    <option value="purchase_price">Purchase Price</option>
                                                    <option value="stamp_duty">Stamp Duty</option>
                                                    <option value="legal_fees">Legal Fees</option>
                                                    <option value="buyers_agent">Buyers Agent</option>
                                                    <option value="building_inspection">Building Inspection</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>

                                            <div className="col-span-1">
                                                <label className="block text-xs text-text-muted mb-1.5">DATE</label>
                                                <input
                                                    type="date"
                                                    value={costBaseForm.date}
                                                    onChange={(e) => setCostBaseForm(prev => ({ ...prev, date: e.target.value }))}
                                                    className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary h-[42px]"
                                                />
                                            </div>
                                            <Input
                                                label="DESCRIPTION"
                                                placeholder="Optional description"
                                                value={costBaseForm.description}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setCostBaseForm(prev => ({ ...prev, description: e.target.value }))
                                                }
                                                className="col-span-1"
                                            />
                                            <Input
                                                label="AMOUNT"
                                                type="number"
                                                placeholder="0.00"
                                                leftIcon={<span className="text-text-muted">$</span>}
                                                value={costBaseForm.amount}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setCostBaseForm(prev => ({ ...prev, amount: e.target.value }))
                                                }
                                            />
                                            <div className="flex items-end">
                                                <Button onClick={handleAddCostBase} className="w-full">
                                                    <Plus className="w-4 h-4" />
                                                    Add
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Cost Base Items Table */}
                                        <div className="border border-border rounded-lg overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-background-secondary">
                                                    <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                                        <th className="px-4 py-3">Category</th>
                                                        <th className="px-4 py-3">Description</th>
                                                        <th className="px-4 py-3">Date</th>
                                                        <th className="px-4 py-3 text-right">Amount</th>
                                                        <th className="w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(!selectedProperty?.costBase || selectedProperty.costBase.length === 0) ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                                                                No cost base items yet. Add purchase price and other capital costs above.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        selectedProperty.costBase.map((item, index) => (
                                                            <tr key={index} className="border-t border-border hover:bg-background-elevated">
                                                                <td className="px-4 py-3">
                                                                    <span className="px-2 py-1 rounded bg-accent/20 text-accent text-xs">
                                                                        {getCostBaseLabel(item.category)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-text-primary">{item.description}</td>
                                                                <td className="px-4 py-3 text-text-secondary">
                                                                    {new Date(item.date).toLocaleDateString('en-AU')}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-medium">
                                                                    ${parseFloat(item.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        onClick={() => handleDeleteCostBase(index)}
                                                                        className="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                                                                        title="Delete Item"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                )}

                                {activeTab === 'depreciation' && selectedProperty && (
                                    <PropertyDepreciationHelper
                                        property={selectedProperty}
                                        onClose={() => setActiveTab('income')}
                                    />
                                )}

                                {activeTab === 'loans' && (
                                    <Card>
                                        <CardHeader
                                            title="Property Loans"
                                            subtitle="Track loans and record deductible interest for your investment property"
                                            action={
                                                <a
                                                    href="https://www.ato.gov.au/individuals-and-families/investments-and-assets/residential-rental-properties/rental-expenses-to-claim/interest-expenses"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                                >
                                                    ATO Guide: Interest Deductions
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            }
                                        />

                                        {/* Add Loan Form */}
                                        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-background-elevated rounded-lg border border-border">
                                            <Input
                                                label="LENDER *"
                                                placeholder="e.g. ANZ, CBA, Macquarie"
                                                value={loanForm.lender}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setLoanForm(prev => ({ ...prev, lender: e.target.value }))
                                                }
                                            />
                                            <Input
                                                label="ACCOUNT NUMBER"
                                                placeholder="Optional"
                                                value={loanForm.accountNumber}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setLoanForm(prev => ({ ...prev, accountNumber: e.target.value }))
                                                }
                                            />
                                            <Input
                                                label="CURRENT BALANCE"
                                                type="number"
                                                placeholder="0.00"
                                                leftIcon={<span className="text-text-muted">$</span>}
                                                value={loanForm.currentBalance}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setLoanForm(prev => ({ ...prev, currentBalance: e.target.value }))
                                                }
                                            />
                                            <Input
                                                label="INTEREST RATE (% p.a.)"
                                                type="number"
                                                step="0.01"
                                                placeholder="5.50"
                                                rightIcon={<span className="text-text-muted">%</span>}
                                                value={loanForm.interestRatePAPercent}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setLoanForm(prev => ({ ...prev, interestRatePAPercent: e.target.value }))
                                                }
                                            />
                                            <div>
                                                <label className="block text-xs text-text-muted mb-1.5">REPAYMENT TYPE</label>
                                                <select
                                                    className="w-full px-3 py-2 rounded-lg bg-background-card border border-border text-text-primary"
                                                    value={loanForm.repaymentType}
                                                    onChange={(e) =>
                                                        setLoanForm(prev => ({
                                                            ...prev,
                                                            repaymentType: e.target.value as 'interest_only' | 'principal_and_interest'
                                                        }))
                                                    }
                                                >
                                                    <option value="principal_and_interest">Principal & Interest</option>
                                                    <option value="interest_only">Interest Only</option>
                                                </select>
                                            </div>
                                            <Input
                                                label={`INTEREST PAID FY${currentFinancialYear.slice(-4)} *`}
                                                type="number"
                                                placeholder="0.00"
                                                leftIcon={<span className="text-text-muted">$</span>}
                                                value={loanForm.annualInterestPaid}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setLoanForm(prev => ({ ...prev, annualInterestPaid: e.target.value }))
                                                }
                                                hint="Total interest paid this FY (deductible)"
                                            />
                                            <div className="col-span-2 flex items-end">
                                                <Button onClick={handleAddLoan} className="w-full">
                                                    <Plus className="w-4 h-4" />
                                                    Add Loan
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Loans Table */}
                                        {propertyLoans.length === 0 ? (
                                            <div className="text-center py-8 text-text-muted">
                                                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                                <p>No loans recorded for this property</p>
                                                <p className="text-sm mt-1">Add a loan above to track interest deductions</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="border border-border rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-background-secondary">
                                                            <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                                                <th className="px-4 py-3">Lender</th>
                                                                <th className="px-4 py-3">Account</th>
                                                                <th className="px-4 py-3 text-right">Balance</th>
                                                                <th className="px-4 py-3 text-right">Rate</th>
                                                                <th className="px-4 py-3">Type</th>
                                                                <th className="px-4 py-3 text-right">Interest Paid (FY)</th>
                                                                <th className="w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {propertyLoans.map((loan) => (
                                                                <tr key={loan.id} className="border-t border-border hover:bg-background-elevated">
                                                                    <td className="px-4 py-3 font-medium text-text-primary">{loan.lender}</td>
                                                                    <td className="px-4 py-3 text-text-secondary">{loan.accountNumber || '-'}</td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        ${parseFloat(loan.currentBalance || '0').toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">{loan.interestRatePAPercent}%</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px-2 py-1 rounded text-xs ${loan.repaymentType === 'interest_only'
                                                                            ? 'bg-warning/20 text-warning'
                                                                            : 'bg-info/20 text-info'
                                                                            }`}>
                                                                            {loan.repaymentType === 'interest_only' ? 'IO' : 'P&I'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-semibold text-success">
                                                                        ${parseFloat(loan.annualInterestPaid || '0').toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <button
                                                                            onClick={() => loan.id && handleDeleteLoan(loan.id)}
                                                                            className="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                                                                            title="Delete Loan"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Total Summary */}
                                                <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm text-text-secondary">Total Deductible Interest (FY{currentFinancialYear.slice(-4)})</p>
                                                        <p className="text-xs text-text-muted mt-1">
                                                            This amount will be included in your property expenses
                                                        </p>
                                                    </div>
                                                    <p className="text-2xl font-bold text-success">
                                                        ${propertyLoans.reduce((sum, loan) => sum + (parseFloat(loan.annualInterestPaid) || 0), 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </Card>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
                                <p className="text-text-secondary">Select a property to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Delete Property"
                message={`Are you sure you want to delete "${deleteConfirm.address}"? This will also delete all associated income and expense records. This action cannot be undone.`}
                confirmText="Delete Property"
                onConfirm={confirmDeleteProperty}
                onCancel={() => setDeleteConfirm({ isOpen: false, id: null, address: '' })}
            />
        </DashboardLayout>
    );
}
