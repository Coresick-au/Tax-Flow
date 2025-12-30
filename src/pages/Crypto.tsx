import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Plus, TrendingUp, TrendingDown, Coins, DollarSign, Trash2 } from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { db } from '../database/db';
import type { CryptoTransaction } from '../types';
import { calculateCapitalGains } from '../utils/capitalGainsCalculator';
import Decimal from 'decimal.js';

export function Crypto() {
    const { currentFinancialYear, currentProfileId, isInitialized, initialize, refreshDashboard } = useTaxFlowStore();
    const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null; asset: string }>({
        isOpen: false, id: null, asset: ''
    });
    const [formData, setFormData] = useState({
        type: 'buy' as 'buy' | 'sell' | 'initial_balance',
        assetName: '',
        date: '',
        price: '',
        quantity: '',
        fees: '',
        exchange: '',
        notes: '',
    });

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Load transactions
    useEffect(() => {
        const loadTransactions = async () => {
            try {
                const txs = await db.cryptoTransactions
                    .where('financialYear')
                    .equals(currentFinancialYear)
                    .filter(tx => tx.profileId === currentProfileId)
                    .toArray();
                setTransactions(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error('Failed to load crypto transactions:', error);
            }
        };
        loadTransactions();
    }, [currentFinancialYear, currentProfileId]);

    // Calculate totals
    const totalBuys = transactions
        .filter(t => t.type === 'buy')
        .reduce((sum, t) => sum.add(t.price || 0), new Decimal(0));

    const totalSells = transactions
        .filter(t => t.type === 'sell')
        .reduce((sum, t) => sum.add(t.price || 0), new Decimal(0));

    const totalFees = transactions
        .reduce((sum, t) => sum.add(t.fees || 0), new Decimal(0));

    // Show delete confirmation
    const handleDelete = (tx: CryptoTransaction) => {
        setDeleteConfirm({
            isOpen: true,
            id: tx.id || null,
            asset: tx.assetName
        });
    };

    // Actually delete after confirmation
    const confirmDelete = async () => {
        if (deleteConfirm.id) {
            await db.cryptoTransactions.delete(deleteConfirm.id);
            setTransactions(prev => prev.filter(t => t.id !== deleteConfirm.id));
            refreshDashboard();
        }
        setDeleteConfirm({ isOpen: false, id: null, asset: '' });
    };

    // Add new transaction
    const handleAddTransaction = async () => {
        if (!formData.assetName || !formData.price || !formData.quantity) return;

        const newTransaction: Omit<CryptoTransaction, 'id'> = {
            profileId: currentProfileId || undefined,
            financialYear: currentFinancialYear,
            type: formData.type,
            assetName: formData.assetName.toUpperCase(),
            date: formData.date ? new Date(formData.date) : new Date(),
            price: formData.price,
            quantity: formData.quantity,
            fees: formData.fees || '0',
            exchange: formData.exchange,
            notes: formData.notes,
            createdAt: new Date(),
        };

        await db.cryptoTransactions.add(newTransaction);
        refreshDashboard();

        // Reload transactions
        const txs = await db.cryptoTransactions
            .where('financialYear')
            .equals(currentFinancialYear)
            .filter(tx => tx.profileId === currentProfileId)
            .toArray();
        setTransactions(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        // Reset form
        setFormData({
            type: 'buy',
            assetName: '',
            date: '',
            price: '',
            quantity: '',
            fees: '',
            exchange: '',
            notes: '',
        });
        setShowAddForm(false);
    };

    // Get unique assets
    const uniqueAssets = [...new Set(transactions.map(t => t.assetName))];

    // Calculate capital gains using FIFO
    const capitalGainsSummary = useMemo(() => {
        return calculateCapitalGains(transactions);
    }, [transactions]);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Crypto & Capital Gains</h1>
                        <p className="text-text-secondary mt-1">
                            Track your cryptocurrency transactions for FY {currentFinancialYear}
                        </p>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)}>
                        <Plus className="w-4 h-4" />
                        Add Transaction
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        title="TOTAL BUYS"
                        value={`$${totalBuys.toNumber().toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
                        icon={<TrendingUp className="w-5 h-5 text-success" />}
                        iconBgColor="bg-success/20"
                    />
                    <StatCard
                        title="TOTAL SELLS"
                        value={`$${totalSells.toNumber().toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
                        icon={<TrendingDown className="w-5 h-5 text-warning" />}
                        iconBgColor="bg-warning/20"
                    />
                    <StatCard
                        title="TOTAL FEES"
                        value={`$${totalFees.toNumber().toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
                        icon={<DollarSign className="w-5 h-5 text-danger" />}
                        iconBgColor="bg-danger/20"
                    />
                    <StatCard
                        title="UNIQUE ASSETS"
                        value={uniqueAssets.length.toString()}
                        icon={<Coins className="w-5 h-5 text-accent" />}
                        iconBgColor="bg-accent/20"
                    />
                </div>

                {/* Capital Gains Summary */}
                <Card>
                    <CardHeader
                        title="Capital Gains Tax Summary"
                        subtitle="FIFO method with 50% CGT discount for assets held over 12 months"
                    />

                    {/* CGT Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-background-elevated rounded-lg">
                        <div>
                            <span className="text-xs text-text-muted uppercase">Total Gains</span>
                            <p className="text-lg font-semibold text-success">
                                ${capitalGainsSummary.totalGains.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-text-muted uppercase">Total Losses</span>
                            <p className="text-lg font-semibold text-danger">
                                -${capitalGainsSummary.totalLosses.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-text-muted uppercase">50% CGT Discount</span>
                            <p className="text-lg font-semibold text-accent">
                                -${capitalGainsSummary.totalDiscountApplied.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-text-muted uppercase">Taxable Capital Gain</span>
                            <p className={`text-lg font-bold ${capitalGainsSummary.taxableCapitalGain.greaterThanOrEqualTo(0) ? 'text-warning' : 'text-success'}`}>
                                ${capitalGainsSummary.taxableCapitalGain.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* CGT Events Table */}
                    {capitalGainsSummary.events.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-background-secondary">
                                    <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Asset</th>
                                        <th className="px-4 py-3 text-right">Qty Sold</th>
                                        <th className="px-4 py-3 text-right">Proceeds</th>
                                        <th className="px-4 py-3 text-right">Cost Base</th>
                                        <th className="px-4 py-3 text-right">Gain/Loss</th>
                                        <th className="px-4 py-3">Discount</th>
                                        <th className="px-4 py-3 text-right">Taxable</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {capitalGainsSummary.events.map((event, idx) => (
                                        <tr key={idx} className="border-t border-border hover:bg-background-elevated">
                                            <td className="px-4 py-3 text-text-secondary">
                                                {event.sellDate.toLocaleDateString('en-AU')}
                                            </td>
                                            <td className="px-4 py-3 text-text-primary font-medium">
                                                {event.assetName}
                                            </td>
                                            <td className="px-4 py-3 text-right text-text-primary">
                                                {event.sellQuantity.toFixed(4)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                ${event.saleProceeds.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-text-secondary">
                                                ${event.costBase.toFixed(2)}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${event.grossGain.greaterThanOrEqualTo(0) ? 'text-success' : 'text-danger'}`}>
                                                ${event.grossGain.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {event.discountApplied ? (
                                                    <span className="px-2 py-1 rounded bg-accent/20 text-accent text-xs">
                                                        50% ({event.holdingPeriodDays}d)
                                                    </span>
                                                ) : (
                                                    <span className="text-text-muted text-xs">
                                                        {event.holdingPeriodDays}d
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">
                                                ${event.taxableGain.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {capitalGainsSummary.events.length === 0 && (
                        <p className="text-center text-text-muted py-4">
                            No capital gains events yet. Sell some assets to see CGT calculations.
                        </p>
                    )}
                </Card>

                {/* Add Transaction Form */}
                {showAddForm && (
                    <Card>
                        <CardHeader
                            title="Add Transaction"
                            subtitle="Record a buy, sell, or existing holdings"
                        />
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-text-muted mb-1.5">TYPE</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' | 'initial_balance' }))}
                                    className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                                >
                                    <option value="buy">Buy</option>
                                    <option value="sell">Sell</option>
                                    <option value="initial_balance">Initial Balance</option>
                                </select>
                            </div>
                            <Input
                                label="ASSET"
                                placeholder="BTC, ETH, etc."
                                value={formData.assetName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, assetName: e.target.value }))
                                }
                            />
                            <Input
                                label="DATE"
                                type="date"
                                value={formData.date}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, date: e.target.value }))
                                }
                            />
                            <Input
                                label="QUANTITY"
                                type="number"
                                placeholder="0.00"
                                value={formData.quantity}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, quantity: e.target.value }))
                                }
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <Input
                                label="TOTAL PRICE (AUD)"
                                type="number"
                                placeholder="0.00"
                                leftIcon={<span className="text-text-muted">$</span>}
                                value={formData.price}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, price: e.target.value }))
                                }
                            />
                            <Input
                                label="FEES (AUD)"
                                type="number"
                                placeholder="0.00"
                                leftIcon={<span className="text-text-muted">$</span>}
                                value={formData.fees}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, fees: e.target.value }))
                                }
                            />
                            <Input
                                label="EXCHANGE"
                                placeholder="Coinbase, Binance, etc."
                                value={formData.exchange}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, exchange: e.target.value }))
                                }
                            />
                            <div className="flex items-end gap-2">
                                <Button onClick={handleAddTransaction} className="flex-1">
                                    Save Transaction
                                </Button>
                                <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Transactions Table */}
                <Card>
                    <CardHeader
                        title="Transaction History"
                        subtitle={`Showing ${transactions.length} transactions for FY ${currentFinancialYear}`}
                    />
                    <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-background-secondary">
                                <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Asset</th>
                                    <th className="px-4 py-3 text-right">Quantity</th>
                                    <th className="px-4 py-3 text-right">Price</th>
                                    <th className="px-4 py-3 text-right">Fees</th>
                                    <th className="px-4 py-3">Exchange</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                                            No transactions yet. Click "Add Transaction" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="border-t border-border hover:bg-background-elevated">
                                            <td className="px-4 py-3 text-text-secondary">
                                                {new Date(tx.date).toLocaleDateString('en-AU')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === 'buy'
                                                    ? 'bg-success/20 text-success'
                                                    : tx.type === 'sell'
                                                        ? 'bg-warning/20 text-warning'
                                                        : 'bg-info/20 text-info'
                                                    }`}>
                                                    {tx.type === 'initial_balance' ? 'INITIAL' : tx.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-text-primary font-medium">
                                                {tx.assetName}
                                            </td>
                                            <td className="px-4 py-3 text-right text-text-primary">
                                                {parseFloat(tx.quantity).toLocaleString('en-AU', { maximumFractionDigits: 8 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                ${parseFloat(tx.price).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right text-text-secondary">
                                                ${parseFloat(tx.fees).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-text-secondary">
                                                {tx.exchange || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDelete(tx)}
                                                    className="p-1 rounded hover:bg-danger/20 text-text-muted hover:text-danger transition-colors"
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
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Delete Transaction"
                message={`Are you sure you want to delete this ${deleteConfirm.asset} transaction? This will affect your capital gains calculations.`}
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, id: null, asset: '' })}
            />
        </DashboardLayout>
    );
}
