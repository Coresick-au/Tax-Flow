import { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { db } from '../../database/db';
import { useTaxFlowStore } from '../../stores/taxFlowStore';
import { Decimal } from 'decimal.js';

interface ChartData {
    name: string;
    income: number;
    expenses: number;
}

export function FinancialTrendChart() {
    const { currentFinancialYear, currentProfileId } = useTaxFlowStore();
    const [data, setData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentProfileId) return;

            const [startYearStr] = currentFinancialYear.split('-');
            const startYear = parseInt(startYearStr);
            const months = [
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'
            ];

            // Initialize monthly buckets
            const monthlyData = months.map(m => ({
                name: m,
                income: new Decimal(0),
                expenses: new Decimal(0),
                // Helper for sorting/dating
                monthIndex: months.indexOf(m)
            }));

            // 1. Process Income (Salary, etc.)
            const incomeRecords = await db.income
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(i => !i.profileId || i.profileId === currentProfileId)
                .toArray();

            incomeRecords.forEach(record => {
                const date = new Date(record.date);
                // Adjust for FY (Jul is 0)
                let monthIdx = date.getMonth() - 6;
                if (monthIdx < 0) monthIdx += 12;

                if (monthIdx >= 0 && monthIdx < 12) {
                    monthlyData[monthIdx].income = monthlyData[monthIdx].income.add(new Decimal(record.amount));
                }
            });

            // 2. Process Property Rent (Annual / 12 for estimation)
            // This is an approximation as we capture annual totals
            const properyIncomes = await db.propertyIncome
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(i => !i.profileId || i.profileId === currentProfileId)
                .toArray();

            const totalAnnualRent = properyIncomes.reduce((sum, p) => sum.add(new Decimal(p.grossRent)), new Decimal(0));
            if (!totalAnnualRent.isZero()) {
                const monthlyRent = totalAnnualRent.div(12);
                monthlyData.forEach(m => {
                    m.income = m.income.add(monthlyRent);
                });
            }

            // 3. Process Receipts (General Expenses)
            const receipts = await db.receipts
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(r => !r.profileId || r.profileId === currentProfileId)
                .toArray();

            receipts.forEach(record => {
                const date = new Date(record.date);
                let monthIdx = date.getMonth() - 6;
                if (monthIdx < 0) monthIdx += 12;

                if (monthIdx >= 0 && monthIdx < 12) {
                    monthlyData[monthIdx].expenses = monthlyData[monthIdx].expenses.add(new Decimal(record.amount));
                }
            });

            // 4. Process Property Expenses
            const propertyExpenses = await db.propertyExpenses
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(e => !e.profileId || e.profileId === currentProfileId)
                .toArray();

            propertyExpenses.forEach(record => {
                const date = new Date(record.date);
                let monthIdx = date.getMonth() - 6;
                if (monthIdx < 0) monthIdx += 12;

                if (monthIdx >= 0 && monthIdx < 12) {
                    monthlyData[monthIdx].expenses = monthlyData[monthIdx].expenses.add(new Decimal(record.amount));
                }
            });

            // Convert Decimals to numbers for Recharts
            const formattedData = monthlyData.map(d => ({
                name: d.name,
                income: Math.round(d.income.toNumber()),
                expenses: Math.round(d.expenses.toNumber())
            }));

            setData(formattedData);
            setIsLoading(false);
        };

        fetchData();
    }, [currentFinancialYear, currentProfileId]);

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-text-muted">Loading chart data...</div>;
    }

    if (data.every(d => d.income === 0 && d.expenses === 0)) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="text-center text-text-muted">
                    <p className="text-sm">No financial data available for this year yet.</p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                />
                <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    name="Income"
                    strokeWidth={2}
                />
                <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#EF4444"
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                    name="Expenses"
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
