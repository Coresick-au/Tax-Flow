import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    AlertTriangle,
    FileText,
    Camera,
    Pencil,
    Link2,
    Eye,
    CheckCircle,
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { DashboardLayout } from '../components/layout';
import { StatCard, Card, CardHeader, Button } from '../components/ui';
import { DeductionModal } from '../components/modals/DeductionModal';

function getTypeColor(type: string): string {
    switch (type) {
        case 'Expense': return 'bg-danger/20 text-danger';
        case 'Income': return 'bg-success/20 text-success';
        case 'Deduction': return 'bg-primary/20 text-primary';
        case 'Transfer': return 'bg-info/20 text-info';
        default: return 'bg-background-elevated text-text-secondary';
    }
}

function formatCurrency(amount: number): string {
    const formatted = Math.abs(amount).toLocaleString('en-AU', {
        style: 'currency',
        currency: 'AUD',
    });
    return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

export function Dashboard() {
    const navigate = useNavigate();
    const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

    const {
        initialize,
        isInitialized,
        isLoading,
        currentFinancialYear,
        estimatedTaxableIncome,
        estimatedTaxPayable,
        totalDeductions,
        deductionCount,
        userProfile,
        auditRiskLevel,
        recentActivity,
        refreshDashboard,
    } = useTaxFlowStore();

    // Quick action handlers
    const handleSnapReceipt = () => {
        navigate('/receipts');
    };

    const handleManualDeduction = () => {
        setIsDeductionModalOpen(true);
    };

    const handleConnectBank = () => {
        alert('Bank connection feature coming soon! This will allow you to automatically sync transactions from your bank account.');
    };

    const handleViewAllActivity = () => {
        navigate('/receipts');
    };

    // Calculate risk indicator position
    const getRiskPosition = () => {
        switch (auditRiskLevel) {
            case 'high': return '85%';
            case 'medium': return '50%';
            case 'low':
            default: return '15%';
        }
    };

    // Get risk text and color
    const getRiskStatus = () => {
        switch (auditRiskLevel) {
            case 'high':
                return {
                    label: 'High Risk',
                    color: 'text-danger',
                    bgColor: 'bg-danger/10 border-danger/30',
                    icon: <AlertTriangle className="w-5 h-5 text-danger" />,
                    description: 'Significantly above ATO averages'
                };
            case 'medium':
                return {
                    label: 'Warning',
                    color: 'text-warning',
                    bgColor: 'bg-warning/10 border-warning/30',
                    icon: <AlertTriangle className="w-5 h-5 text-warning" />,
                    description: 'Above average for some categories'
                };
            case 'low':
            default:
                return {
                    label: 'Safe Zone',
                    color: 'text-success',
                    bgColor: 'bg-success/10 border-success/30',
                    icon: <CheckCircle className="w-5 h-5 text-success" />,
                    description: 'Within safe range'
                };
        }
    };

    const riskStatus = getRiskStatus();

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
                    <p className="text-text-secondary">Overview for Financial Year {currentFinancialYear}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" className="text-warning border-warning">
                        <AlertTriangle className="w-4 h-4" />
                        BAS Due in 14 Days
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                        Privacy Mode
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                    title="Est. Taxable Income"
                    value={`$${estimatedTaxableIncome.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`}
                    trend={{ value: 2.4 }}
                    subtitle={`On track for $${(estimatedTaxableIncome.toNumber() * 1.2).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} projection`}
                    icon={<TrendingUp className="w-5 h-5 text-accent" />}
                    iconBgColor="bg-accent/20"
                />
                <StatCard
                    title="Current Tax Liability"
                    value={`$${estimatedTaxPayable.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`}
                    trend={{ value: 1.1 }}
                    subtitle="Based on resident tax rates"
                    icon={<AlertTriangle className="w-5 h-5 text-warning" />}
                    iconBgColor="bg-warning/20"
                />
                <StatCard
                    title="Total Deductions"
                    value={`$${totalDeductions.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`}
                    subtitle={`Last claim: Officeworks ($120)`}
                    icon={<FileText className="w-5 h-5 text-primary" />}
                    iconBgColor="bg-primary/20"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Financial Trend Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Financial Trend"
                        subtitle="Income vs Deductions (Last 12 Months)"
                        action={
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                                    Income
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-chart-expense"></span>
                                    Expenses
                                </span>
                            </div>
                        }
                    />
                    <div className="h-64 flex items-center justify-center">
                        <div className="text-center text-text-muted">
                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Add income and expenses to see your financial trends</p>
                            <p className="text-xs mt-1">Data will appear as you track your finances</p>
                        </div>
                    </div>
                </Card>

                {/* Audit Risk Level */}
                <Card>
                    <CardHeader
                        title="Audit Risk Level"
                        action={<AlertTriangle className="w-4 h-4 text-text-muted" />}
                    />
                    <p className="text-sm text-text-secondary mb-4">
                        Your deduction profile is currently
                        <span className={`font-medium ml-1 ${riskStatus.color}`}>
                            {riskStatus.description.toLowerCase()}
                        </span>
                        {' '}for your occupation code
                        <span className="text-primary ml-1 font-mono">
                            {userProfile?.occupationCode || 'default'}
                        </span>.
                    </p>

                    {/* Risk Gauge */}
                    <div className="mb-4">
                        <div className="relative h-3 rounded-full overflow-hidden bg-background-elevated">
                            <div className="absolute inset-0 flex">
                                <div className="w-1/3 bg-success"></div>
                                <div className="w-1/3 bg-warning"></div>
                                <div className="w-1/3 bg-danger"></div>
                            </div>
                            {/* Indicator */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-5 bg-white rounded-sm shadow-lg border-2 border-background transition-all duration-500 ease-out"
                                style={{ left: getRiskPosition() }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-medium">
                            <span className="text-success">LOW</span>
                            <span className="text-warning">MEDIUM</span>
                            <span className="text-danger">HIGH</span>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${riskStatus.bgColor}`}>
                        {riskStatus.icon}
                        <span className={`text-sm font-medium ${riskStatus.color}`}>{riskStatus.label}</span>
                    </div>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <Card>
                    <CardHeader title="Quick Actions" />
                    <div className="space-y-3">
                        <button
                            onClick={handleSnapReceipt}
                            className="w-full flex items-center gap-4 p-3 rounded-lg bg-background-elevated hover:bg-background border border-border-muted transition-colors"
                        >
                            <div className="p-2 rounded-lg bg-primary/20">
                                <Camera className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-text-primary">Snap Receipt</p>
                                <p className="text-xs text-text-muted">Upload & Process via OCR</p>
                            </div>
                        </button>
                        <button
                            onClick={handleManualDeduction}
                            className="w-full flex items-center gap-4 p-3 rounded-lg bg-background-elevated hover:bg-background border border-border-muted transition-colors"
                        >
                            <div className="p-2 rounded-lg bg-accent/20">
                                <Pencil className="w-5 h-5 text-accent" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-text-primary">Manual Deduction</p>
                                <p className="text-xs text-text-muted">Log work expense</p>
                            </div>
                        </button>
                        <button
                            onClick={handleConnectBank}
                            className="w-full flex items-center gap-4 p-3 rounded-lg bg-background-elevated hover:bg-background border border-border-muted transition-colors"
                        >
                            <div className="p-2 rounded-lg bg-info/20">
                                <Link2 className="w-5 h-5 text-info" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-text-primary">Connect Bank</p>
                                <p className="text-xs text-text-muted">Sync new transactions</p>
                            </div>
                        </button>
                    </div>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader
                        title="Recent Activity"
                        action={
                            <button
                                onClick={handleViewAllActivity}
                                className="text-sm text-primary hover:underline"
                            >
                                View All
                            </button>
                        }
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Type</th>
                                    <th className="pb-3 font-medium">Description</th>
                                    <th className="pb-3 font-medium">Category</th>
                                    <th className="pb-3 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-text-muted">
                                            No recent activity. Add income or expenses to see them here.
                                        </td>
                                    </tr>
                                ) : (
                                    recentActivity.map((item, index) => (
                                        <tr key={index} className="border-t border-border-muted">
                                            <td className="py-3 text-text-secondary">
                                                {new Date(item.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="py-3 text-text-primary">{item.description}</td>
                                            <td className="py-3 text-text-secondary">{item.category}</td>
                                            <td className={`py-3 text-right font-medium ${item.amount.toNumber() >= 0 ? 'text-success' : 'text-text-primary'}`}>
                                                {formatCurrency(item.amount.toNumber())}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Deduction Modal */}
            {isDeductionModalOpen && (
                <DeductionModal
                    isOpen={isDeductionModalOpen}
                    onClose={() => setIsDeductionModalOpen(false)}
                    onSave={() => {
                        setIsDeductionModalOpen(false);
                        refreshDashboard();
                    }}
                />
            )}
        </DashboardLayout>
    );
}
