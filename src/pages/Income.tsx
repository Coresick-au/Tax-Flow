import { useState, useEffect } from 'react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { db } from '../database/db';
import { DashboardLayout } from '../components/layout';
import { Card, Button, Input, ConfirmDialog } from '../components/ui';
import { Plus, DollarSign, Trash2, Edit2, Calendar, FileText } from 'lucide-react';
import type { IncomeRecord, IncomeCategory } from '../types';
import Decimal from 'decimal.js';

export function Income() {
    const { currentFinancialYear, refreshDashboard, currentProfileId } = useTaxFlowStore();
    const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
        isOpen: false, id: null
    });

    const [formData, setFormData] = useState<{
        category: IncomeCategory;
        amount: string;
        grossAmount: string;
        bonuses: string;
        description: string;
        payer: string;
        taxWithheld: string;
        date: string;
    }>({
        category: 'ato_summary',
        amount: '',
        grossAmount: '',
        bonuses: '',
        description: '',
        payer: '',
        taxWithheld: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (currentProfileId) {
            loadIncome();
        }
    }, [currentFinancialYear, currentProfileId]);

    const loadIncome = async () => {
        setIsLoading(true);
        try {
            const records = await db.income
                .where('financialYear')
                .equals(currentFinancialYear)
                .filter(record => record.profileId === currentProfileId)
                .reverse()
                .sortBy('date');

            setIncomeRecords(records);
        } catch (error) {
            console.error('Failed to load income:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (record: IncomeRecord) => {
        setFormData({
            category: record.category,
            amount: record.amount,
            grossAmount: record.grossAmount || '',
            bonuses: record.bonuses || '',
            description: record.description,
            payer: record.payer || '',
            taxWithheld: record.taxWithheld || '',
            date: new Date(record.date).toISOString().split('T')[0],
        });
        setEditingId(record.id || null);
        setShowAddForm(true);
    };

    const handleDelete = (id: number) => {
        setDeleteConfirm({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        if (deleteConfirm.id) {
            await db.income.delete(deleteConfirm.id);
            await loadIncome();
            await refreshDashboard();
        }
        setDeleteConfirm({ isOpen: false, id: null });
    };

    const handleSave = async () => {
        if (!formData.amount || !formData.date || !currentProfileId) return;

        try {
            const record = {
                profileId: currentProfileId,
                financialYear: currentFinancialYear,
                date: new Date(formData.date),
                category: formData.category,
                amount: formData.amount,
                grossAmount: formData.grossAmount,
                bonuses: formData.bonuses,
                description: formData.description,
                payer: formData.payer,
                taxWithheld: formData.taxWithheld,
                isTaxFree: false,
                updatedAt: new Date(),
            };

            if (editingId) {
                await db.income.update(editingId, record);
            } else {
                await db.income.add({
                    ...record,
                    createdAt: new Date(),
                } as IncomeRecord);
            }

            setFormData({
                category: 'ato_summary',
                amount: '',
                grossAmount: '',
                bonuses: '',
                description: '',
                payer: '',
                taxWithheld: '',
                date: new Date().toISOString().split('T')[0],
            });
            setShowAddForm(false);
            setEditingId(null);
            await loadIncome();
            await refreshDashboard();
        } catch (error) {
            console.error('Failed to save income:', error);
        }
    };

    const getTotalIncome = () => {
        return incomeRecords.reduce((sum, record) => sum.plus(record.amount || 0), new Decimal(0));
    };

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Income</h1>
                    <p className="text-text-secondary">Track salary, dividends, and other earnings</p>
                </div>
                <Button onClick={() => { setShowAddForm(true); setEditingId(null); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Income
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/20 text-primary">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-text-secondary">Total Income (FY)</p>
                            <p className="text-xl font-bold text-text-primary">${getTotalIncome().toNumber().toLocaleString()}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <Card className="mb-6 p-4 border border-primary/20">
                    <h3 className="font-semibold mb-4">{editingId ? 'Edit Income' : 'Add New Income'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as IncomeCategory }))}
                                className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                            >
                                <option value="ato_summary">📋 ATO Payment Summary / PAYG</option>
                                <option value="salary">Salary / Wages</option>
                                <option value="dividends">Dividends</option>
                                <option value="interest">Bank Interest</option>
                                <option value="government_payment">Government Payment</option>
                                <option value="other">Other Income</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Date</label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Payer (Optional)</label>
                            <Input
                                placeholder="Employer or Bank Name"
                                value={formData.payer}
                                onChange={(e) => setFormData(prev => ({ ...prev, payer: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Description</label>
                            <Input
                                placeholder="e.g. Monthly Pay"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Salary/PAYG specific fields with breakdown */}
                    {(formData.category === 'salary' || formData.category === 'ato_summary') ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Gross Amount (Base Salary)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                                        <Input
                                            className="pl-9"
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.grossAmount || ''}
                                            onChange={(e) => setFormData(prev => {
                                                const grossAmount = e.target.value;
                                                const bonuses = prev.bonuses || '0';
                                                const total = (parseFloat(grossAmount) || 0) + (parseFloat(bonuses) || 0);
                                                return { ...prev, grossAmount, amount: total.toString() };
                                            })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Bonuses & Commissions</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                                        <Input
                                            className="pl-9"
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.bonuses || ''}
                                            onChange={(e) => setFormData(prev => {
                                                const bonuses = e.target.value;
                                                const grossAmount = prev.grossAmount || '0';
                                                const total = (parseFloat(grossAmount) || 0) + (parseFloat(bonuses) || 0);
                                                return { ...prev, bonuses, amount: total.toString() };
                                            })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Total Gross Amount</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                                        <Input
                                            className="pl-9 bg-background-elevated/50"
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            readOnly
                                        />
                                    </div>
                                    <p className="text-xs text-text-muted mt-1">Auto-calculated</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">PAYGW Tax Withheld</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                                        <Input
                                            className="pl-9"
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.taxWithheld}
                                            onChange={(e) => setFormData(prev => ({ ...prev, taxWithheld: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Amount</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                                    <Input
                                        className="pl-9"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Tax Withheld (Optional)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                                    <Input
                                        className="pl-9"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.taxWithheld}
                                        onChange={(e) => setFormData(prev => ({ ...prev, taxWithheld: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2 mt-4 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Record</Button>
                    </div>
                </Card>
            )}

            {/* Income List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-text-muted">Loading income records...</div>
                ) : incomeRecords.length === 0 ? (
                    <div className="text-center py-12 bg-background-elevated rounded-lg border border-border border-dashed">
                        <DollarSign className="w-12 h-12 text-text-muted mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-text-primary">No Income Recorded</h3>
                        <p className="text-text-secondary mb-4">Add your salary, dividends, or interest to track your taxable income.</p>
                        <Button onClick={() => setShowAddForm(true)}>Add First Income</Button>
                    </div>
                ) : (
                    incomeRecords.map(record => (
                        <div key={record.id} className="flex items-center justify-between p-4 bg-background-elevated rounded-lg border border-border hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full bg-background-secondary text-primary">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-text-primary capitalize">{record.category.replace('_', ' ')}</h4>
                                    <div className="flex gap-2 text-sm text-text-secondary">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(record.date).toLocaleDateString()}</span>
                                        {record.payer && <span>• {record.payer}</span>}
                                    </div>
                                    {record.description && <p className="text-xs text-text-muted mt-0.5">{record.description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="font-bold text-text-primary">${Number(record.amount).toLocaleString()}</p>
                                    {record.taxWithheld && Number(record.taxWithheld) > 0 && (
                                        <p className="text-xs text-red-400">-${Number(record.taxWithheld).toLocaleString()} Tax</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(record)} className="p-1.5 hover:bg-background-secondary rounded-md text-text-secondary hover:text-primary">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => record.id && handleDelete(record.id)} className="p-1.5 hover:bg-background-secondary rounded-md text-text-secondary hover:text-danger">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Delete Income Record"
                message="Are you sure you want to delete this income record? This action cannot be undone."
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
            />
        </DashboardLayout>
    );
}
