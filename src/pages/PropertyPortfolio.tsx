import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Building2,
    TrendingUp,
    DollarSign,
    Wrench,
    ExternalLink,
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { DashboardLayout } from '../components/layout';
import { Card, CardHeader, Button, StatCard, Input } from '../components/ui';
import { db } from '../database/db';
import type { Property, PropertyIncome, PropertyExpense } from '../types';

type PropertyTab = 'income' | 'expenses' | 'maintenance' | 'loans' | 'purchase';

export function PropertyPortfolio() {
    const { initialize, isInitialized, currentFinancialYear, refreshDashboard } = useTaxFlowStore();
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [activeTab, setActiveTab] = useState<PropertyTab>('income');
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Income state
    const [propertyIncome, setPropertyIncome] = useState<PropertyIncome | null>(null);
    const [incomeForm, setIncomeForm] = useState({
        grossRent: '',
        insurancePayouts: '',
        otherIncome: '',
    });

    // Expenses state
    const [propertyExpenses, setPropertyExpenses] = useState<PropertyExpense[]>([]);

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

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Load properties from database
    useEffect(() => {
        const loadProperties = async () => {
            setIsLoading(true);
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
            } finally {
                setIsLoading(false);
            }
        };

        if (currentFinancialYear) {
            loadProperties();
        }
    }, [currentFinancialYear, selectedProperty]);

    // Load income and expenses when property is selected
    useEffect(() => {
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
            } catch (error) {
                console.error('Failed to load property data:', error);
            }
        };

        loadPropertyData();
    }, [selectedProperty, currentFinancialYear]);

    const tabs: { id: PropertyTab; label: string; count?: number }[] = [
        { id: 'income', label: 'Income' },
        { id: 'expenses', label: 'Recurrent Expenses', count: propertyExpenses.length },
        { id: 'maintenance', label: 'Maintenance Log', count: maintenanceRecords.length },
        { id: 'loans', label: 'Loans' },
        { id: 'purchase', label: 'Purchase Data' },
    ];

    const getYieldColor = (yieldPercent: number) => {
        if (yieldPercent >= 4) return 'text-success';
        if (yieldPercent >= 2) return 'text-warning';
        return 'text-danger';
    };

    // State for editing property
    const [isEditing, setIsEditing] = useState(false);

    // ... existing code ...

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

    // ... existing code ...

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

    return (
        <DashboardLayout>
            <div className="flex gap-6 h-[calc(100vh-7rem)]">
                {/* Property List Sidebar */}
                <div className="w-72 flex-shrink-0 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-text-primary">Your Properties</h2>
                        <Button size="sm" className="p-2" onClick={() => setShowAddProperty(!showAddProperty)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Add/Edit Property Form */}
                    {showAddProperty && (
                        <Card className="mb-4 p-3">
                            <h3 className="font-medium text-sm mb-3">{isEditing ? 'Edit Property' : 'Add New Property'}</h3>
                            <div className="space-y-2">
                                <Input
                                    placeholder="Street address"
                                    value={newPropertyForm.address}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setNewPropertyForm(prev => ({ ...prev, address: e.target.value }))
                                    }
                                />
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
                        {properties.map((property) => {
                            const yieldPercent = 4.2; // Mock yield
                            return (
                                <button
                                    key={property.id}
                                    onClick={() => setSelectedProperty(property)}
                                    className={`w-full p-3 rounded-lg text-left transition-colors ${selectedProperty?.id === property.id
                                        ? 'bg-accent/20 border border-accent'
                                        : 'bg-background-card border border-border-muted hover:border-primary'
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-background-elevated flex items-center justify-center">
                                            <Building2 className="w-6 h-6 text-text-muted" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-text-primary truncate">{property.address}</p>
                                            <p className="text-xs text-text-muted truncate">
                                                {property.suburb} {property.state} {property.postcode}
                                            </p>
                                            <div className={`text-xs font-medium mt-1 ${getYieldColor(yieldPercent)}`}>
                                                {yieldPercent.toFixed(1)}% Yield
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
                                        <span>Cost Base: <span className="text-text-primary font-medium">$850,000</span></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
                                        ACTIVE
                                    </span>
                                    <Button variant="secondary" size="sm">
                                        Property Settings
                                    </Button>
                                    <Button size="sm" onClick={handleEditProperty}>
                                        Edit Details
                                    </Button>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <StatCard
                                    title="NET YIELD (YTD)"
                                    value="4.2%"
                                    trend={{ value: 0.3 }}
                                    icon={<TrendingUp className="w-5 h-5 text-success" />}
                                    iconBgColor="bg-success/20"
                                />
                                <StatCard
                                    title="GROSS INCOME (YTD)"
                                    value="$42,500"
                                    icon={<DollarSign className="w-5 h-5 text-accent" />}
                                    iconBgColor="bg-accent/20"
                                />
                                <StatCard
                                    title="TOTAL EXPENSES (YTD)"
                                    value="$12,450"
                                    icon={<DollarSign className="w-5 h-5 text-warning" />}
                                    iconBgColor="bg-warning/20"
                                />
                                <StatCard
                                    title="MAINTENANCE (YTD)"
                                    value="$3,200"
                                    subtitle="▲ High"
                                    icon={<Wrench className="w-5 h-5 text-danger" />}
                                    iconBgColor="bg-danger/20"
                                />
                            </div>

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
                                                <a href="#" className="text-sm text-primary hover:underline flex items-center gap-1">
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
                                                <Button variant="secondary">
                                                    <Plus className="w-4 h-4" />
                                                    Add Expense
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
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
                                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-background-elevated rounded-lg">
                                            <div>
                                                <span className="text-xs text-text-muted uppercase">Purchase Date</span>
                                                <p className="text-lg font-semibold text-text-primary">
                                                    {selectedProperty?.purchaseDate
                                                        ? new Date(selectedProperty.purchaseDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                                                        : 'Not set'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-text-muted uppercase">Total Cost Base</span>
                                                <p className="text-lg font-semibold text-accent">
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
                                            <Input
                                                label="DESCRIPTION"
                                                placeholder="Optional description"
                                                value={costBaseForm.description}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setCostBaseForm(prev => ({ ...prev, description: e.target.value }))
                                                }
                                                className="col-span-2"
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
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(!selectedProperty?.costBase || selectedProperty.costBase.length === 0) ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
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
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                )}

                                {activeTab === 'loans' && (
                                    <Card>
                                        <div className="text-center py-12">
                                            <div className="w-12 h-12 bg-background-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                                                <DollarSign className="w-6 h-6 text-text-muted" />
                                            </div>
                                            <p className="text-text-secondary mb-4">
                                                Loans section coming soon
                                            </p>
                                            <Button variant="secondary">
                                                <Plus className="w-4 h-4" />
                                                Add Loan
                                            </Button>
                                        </div>
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
        </DashboardLayout>
    );
}
