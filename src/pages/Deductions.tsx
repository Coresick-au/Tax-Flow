import { useEffect, useState } from 'react';

import { useTaxFlowStore } from '../stores/taxFlowStore';
import { DashboardLayout } from '../components/layout';
import { Card, CardHeader, Button, StatCard } from '../components/ui';
import { WfhCalculator } from '../components/WfhCalculator';
import { DepreciationHelper } from '../components/helpers/DepreciationHelper';
import { db } from '../database/db';
import { DeductionModal } from '../components/modals/DeductionModal';
import { AssetModal } from '../components/modals/AssetModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Plus, DollarSign, Sparkles, Trash2, Home, Calculator, Briefcase, FileText } from 'lucide-react';
import type { WfhCalculationResult } from '../utils/wfhCalculator';
import type { DepreciableAsset } from '../types';
import Decimal from 'decimal.js';

type DeductionTab = 'wfh' | 'assets' | 'expenses' | 'summary';

export function Deductions() {
    const {
        initialize,
        isInitialized,
        currentFinancialYear,
        taxSettings,
        totalDeductions,
        deductionCount,
        refreshDashboard,
    } = useTaxFlowStore();

    const [activeTab, setActiveTab] = useState<DeductionTab>('wfh');
    const [savedWfhResult, setSavedWfhResult] = useState<WfhCalculationResult | null>(null);
    const [showDepreciationHelper, setShowDepreciationHelper] = useState(false);
    const [showDeductionModal, setShowDeductionModal] = useState(false);
    const [showAssetModal, setShowAssetModal] = useState(false);

    // Asset state
    const [assets, setAssets] = useState<DepreciableAsset[]>([]);
    const [deleteAssetConfirm, setDeleteAssetConfirm] = useState<{ isOpen: boolean; id: number | null; name: string }>({
        isOpen: false, id: null, name: ''
    });

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Load existing WFH deduction on mount
    useEffect(() => {
        const loadExistingWfh = async () => {
            const existing = await db.workDeductions
                .where('financialYear')
                .equals(currentFinancialYear)
                .first();

            if (existing) {
                setSavedWfhResult({
                    method: existing.wfhMethod,
                    totalHours: existing.totalHoursWorked,
                    ratePerHour: new Decimal(0.67),
                    totalDeduction: existing.wfhMethod === 'fixed_rate'
                        ? new Decimal(existing.totalHoursWorked).mul(0.67)
                        : new Decimal(Object.values(existing.actualCosts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)),
                    breakdown: [],
                });
            }
        };

        if (currentFinancialYear) {
            loadExistingWfh();
            loadAssets();
        }
    }, [currentFinancialYear]);

    const loadAssets = async () => {
        const assetList = await db.depreciableAssets
            .where('financialYear')
            .equals(currentFinancialYear)
            .toArray();
        setAssets(assetList);
    };

    const handleDeleteAsset = (asset: DepreciableAsset) => {
        setDeleteAssetConfirm({
            isOpen: true,
            id: asset.id || null,
            name: asset.itemName
        });
    };

    const confirmDeleteAsset = async () => {
        if (deleteAssetConfirm.id) {
            await db.depreciableAssets.delete(deleteAssetConfirm.id);
            await loadAssets();
            await refreshDashboard();
        }
        setDeleteAssetConfirm({ isOpen: false, id: null, name: '' });
    };

    const handleSaveWfh = async (result: WfhCalculationResult) => {
        setSavedWfhResult(result);

        // Find existing record to update, or create new
        const existing = await db.workDeductions
            .where('financialYear')
            .equals(currentFinancialYear)
            .first();

        const workDeductionData = {
            financialYear: currentFinancialYear,
            wfhMethod: result.method,
            totalHoursWorked: result.totalHours,
            actualCosts: {
                electricity: '',
                internet: '',
                cleaning: '',
                phoneUsage: '',
                stationery: '',
            },
            updatedAt: new Date(),
        };

        if (existing?.id) {
            await db.workDeductions.update(existing.id, workDeductionData);
        } else {
            await db.workDeductions.add({
                ...workDeductionData,
                createdAt: new Date(),
            });
        }

        await refreshDashboard();

        console.log('Saved WFH result to database:', result);
    };

    const tabs = [
        { id: 'wfh' as const, label: 'Work From Home', icon: Home },
        { id: 'assets' as const, label: 'Assets & Depreciation', icon: Calculator },
        { id: 'expenses' as const, label: 'Work Expenses', icon: Briefcase },
        { id: 'summary' as const, label: 'Summary', icon: FileText },
    ];

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Deductions</h1>
                    <p className="text-text-secondary">Manage your tax deductions for FY {currentFinancialYear}</p>
                </div>
                <Button onClick={() => setShowDeductionModal(true)}>
                    <Plus className="w-4 h-4" />
                    Add Deduction
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                    title="Total Deductions"
                    value={`$${totalDeductions.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`}
                    subtitle={`${deductionCount} items claimed`}
                    icon={<DollarSign className="w-5 h-5 text-accent" />}
                    iconBgColor="bg-accent/20"
                />
                <StatCard
                    title="WFH Deduction"
                    value={savedWfhResult ? `$${savedWfhResult.totalDeduction.toFixed(0)}` : '$0'}
                    subtitle={savedWfhResult ? `${savedWfhResult.method === 'fixed_rate' ? 'Fixed Rate' : 'Actual Cost'} method` : 'Not calculated'}
                    icon={<Home className="w-5 h-5 text-primary" />}
                    iconBgColor="bg-primary/20"
                />
                <StatCard
                    title="Asset Depreciation"
                    value={`$${assets.reduce((sum, a) => sum + (parseFloat(a.cost) * (a.workUsePercentage / 100)), 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`}
                    subtitle={`${assets.length} assets tracked`}
                    icon={<Calculator className="w-5 h-5 text-info" />}
                    iconBgColor="bg-info/20"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-background-secondary rounded-lg w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-accent text-text-inverse'
                            : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'wfh' && taxSettings && (
                    <WfhCalculator taxSettings={taxSettings} onSave={handleSaveWfh} />
                )}

                {activeTab === 'assets' && (
                    <>
                        <Card>
                            <CardHeader
                                title="Assets & Depreciation"
                                subtitle="Track depreciable assets over $300"
                            />
                            <div className="flex justify-between items-center mb-4">
                                <div />
                                <Button variant="secondary" onClick={() => setShowDepreciationHelper(!showDepreciationHelper)}>
                                    <Sparkles className="w-4 h-4" />
                                    {showDepreciationHelper ? 'Hide AI Helper' : 'AI Depreciation Helper'}
                                </Button>
                            </div>

                            {assets.length === 0 ? (
                                <div className="text-center py-12">
                                    <Calculator className="w-12 h-12 text-text-muted mx-auto mb-4" />
                                    <p className="text-text-secondary mb-4">No assets tracked yet</p>
                                    <Button variant="secondary" onClick={() => setShowAssetModal(true)}>
                                        <Plus className="w-4 h-4" />
                                        Add Asset
                                    </Button>
                                </div>
                            ) : (
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <div className="flex justify-end p-4 bg-background-secondary border-b border-border">
                                        <Button onClick={() => setShowAssetModal(true)}>
                                            <Plus className="w-4 h-4" />
                                            Add Asset
                                        </Button>
                                    </div>
                                    <table className="w-full">
                                        <thead className="bg-background-secondary">
                                            <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                                <th className="px-4 py-3">Asset</th>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3 text-right">Cost</th>
                                                <th className="px-4 py-3 text-right">Work Use</th>
                                                <th className="px-4 py-3">Method</th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assets.map(asset => (
                                                <tr key={asset.id} className="border-t border-border hover:bg-background-elevated">
                                                    <td className="px-4 py-3 font-medium text-text-primary">{asset.itemName}</td>
                                                    <td className="px-4 py-3 text-text-secondary">{new Date(asset.purchaseDate).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-right text-text-primary">${parseFloat(asset.cost).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right text-text-secondary">{asset.workUsePercentage}%</td>
                                                    <td className="px-4 py-3 text-text-secondary capitalize">{asset.method.replace('_', ' ')}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleDeleteAsset(asset)}
                                                            className="p-1 rounded hover:bg-danger/20 text-text-muted hover:text-danger transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                        {showDepreciationHelper && (
                            <div className="mt-6">
                                <DepreciationHelper onClose={() => setShowDepreciationHelper(false)} />
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'expenses' && (
                    <Card>
                        <CardHeader
                            title="Work Expenses"
                            subtitle="Uniforms, tools, professional subscriptions, and more"
                        />
                        <div className="text-center py-12">
                            <Briefcase className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <p className="text-text-secondary mb-4">No work expenses recorded</p>
                            <Button variant="secondary" onClick={() => setShowDeductionModal(true)}>
                                <Plus className="w-4 h-4" />
                                Add Expense
                            </Button>
                        </div>
                    </Card>
                )}

                {activeTab === 'summary' && (
                    <Card>
                        <CardHeader
                            title="Deduction Summary"
                            subtitle={`Overview for FY ${currentFinancialYear}`}
                        />
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-text-secondary">Work From Home</span>
                                <span className="font-medium text-text-primary">
                                    ${savedWfhResult?.totalDeduction.toFixed(2) || '0.00'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-text-secondary">Asset Depreciation</span>
                                <span className="font-medium text-text-primary">$0.00</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-text-secondary">Work Expenses</span>
                                <span className="font-medium text-text-primary">$0.00</span>
                            </div>
                            <div className="flex justify-between items-center py-3 pt-4">
                                <span className="text-lg font-semibold text-text-primary">Total Deductions</span>
                                <span className="text-lg font-bold text-accent">
                                    ${savedWfhResult?.totalDeduction.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </Card>
                )}
            </div>


            <DeductionModal
                isOpen={showDeductionModal}
                onClose={() => setShowDeductionModal(false)}
                onSave={() => refreshDashboard()}
            />

            <AssetModal
                isOpen={showAssetModal}
                onClose={() => setShowAssetModal(false)}
                onSave={() => refreshDashboard()}
            />
            <ConfirmDialog
                isOpen={deleteAssetConfirm.isOpen}
                title="Delete Asset"
                message={`Are you sure you want to delete "${deleteAssetConfirm.name}"? This will affect your depreciation schedule.`}
                confirmText="Delete Asset"
                onConfirm={confirmDeleteAsset}
                onCancel={() => setDeleteAssetConfirm({ isOpen: false, id: null, name: '' })}
            />
        </DashboardLayout >
    );
}
