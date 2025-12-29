import { useEffect } from 'react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { DashboardLayout } from '../components/layout';
import { Card, CardHeader, Button } from '../components/ui';
import { Download, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export function Reports() {
    const {
        initialize,
        isInitialized,
        currentFinancialYear,
        estimatedTaxableIncome,
        estimatedTaxPayable,
        totalDeductions,
        safetyCheckItems,
        auditRiskLevel,
    } = useTaxFlowStore();

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Calculate derived values
    const medicareLevy = estimatedTaxableIncome.mul(0.02); // Approx 2%
    const totalIncome = estimatedTaxableIncome.plus(totalDeductions);

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

    return (
        <DashboardLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Financial Reports</h1>
                    <p className="text-text-secondary">Detailed breakdown for FY {currentFinancialYear}</p>
                </div>
                <Button variant="secondary">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                </Button>
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
                                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Amount']}
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
                        subtitle="Detailed analysis of ATO compliance risks"
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
                                {auditRiskLevel === 'low' ? 'Your deductions are within expected ranges for your occupation.' :
                                    auditRiskLevel === 'medium' ? 'Some deductions are higher than average. Ensure you have receipts.' :
                                        'Multiple deductions are significantly above average. Audit probability is elevated.'}
                            </p>
                        </div>

                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-background-secondary">
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
                                            <td colSpan={4} className="px-4 py-8 text-center text-text-muted">No deductions analyzed yet</td>
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

                        <div className="flex items-start gap-2 text-xs text-text-muted mt-4">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            <p>Benchmarks based on 2023-2024 ATO statistics for your selected occupation. High claims are allowed but must be substantiated.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
