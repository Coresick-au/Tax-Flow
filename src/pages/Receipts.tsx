import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import {
    Plus, Receipt as ReceiptIcon, Upload, X, AlertTriangle,
    Search, Filter, Trash2, FileText
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { db } from '../database/db';
import type { Receipt, ExpenseCategory } from '../types';

// Grey area categories that trigger warnings
const GREY_AREA_CATEGORIES: ExpenseCategory[] = ['work_clothing', 'self_education', 'home_office', 'car_expenses'];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    work_clothing: 'Work Clothing',
    tools_equipment: 'Tools & Equipment',
    self_education: 'Self Education',
    travel: 'Travel Expenses',
    phone_internet: 'Phone & Internet',
    union_fees: 'Union Fees',
    professional_subscriptions: 'Professional Subscriptions',
    car_expenses: 'Car Expenses',
    home_office: 'Home Office',
    other: 'Other',
};

export function Receipts() {
    const { currentFinancialYear, isInitialized, initialize, refreshDashboard } = useTaxFlowStore();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        date: '',
        vendor: '',
        amount: '',
        category: 'other' as ExpenseCategory,
        description: '',
        attachment: null as File | null,
    });

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Load receipts
    useEffect(() => {
        const loadReceipts = async () => {
            try {
                const recs = await db.receipts
                    .where('financialYear')
                    .equals(currentFinancialYear)
                    .toArray();
                setReceipts(recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error('Failed to load receipts:', error);
            }
        };
        loadReceipts();
    }, [currentFinancialYear]);

    // Add new receipt
    const handleAddReceipt = async () => {
        if (!formData.vendor || !formData.amount) return;

        const isGreyArea = GREY_AREA_CATEGORIES.includes(formData.category);

        const newReceipt: Omit<Receipt, 'id'> = {
            financialYear: currentFinancialYear,
            date: formData.date ? new Date(formData.date) : new Date(),
            vendor: formData.vendor,
            amount: formData.amount,
            category: formData.category,
            description: formData.description,
            isGreyArea,
            createdAt: new Date(),
        };

        // Handle file attachment
        if (formData.attachment) {
            newReceipt.attachmentBlob = formData.attachment;
            newReceipt.attachmentName = formData.attachment.name;
            newReceipt.attachmentType = formData.attachment.type;
        }

        await db.receipts.add(newReceipt);

        // Reload lists and refresh dashboard stats
        const recs = await db.receipts
            .where('financialYear')
            .equals(currentFinancialYear)
            .toArray();
        setReceipts(recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        await refreshDashboard();

        // Reset form
        setFormData({
            date: '',
            vendor: '',
            amount: '',
            category: 'other',
            description: '',
            attachment: null,
        });
        setShowAddModal(false);
    };

    // Delete receipt
    const handleDelete = async (id: number) => {
        await db.receipts.delete(id);
        setReceipts(prev => prev.filter(r => r.id !== id));
        await refreshDashboard();
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, attachment: file }));
        }
    };

    // Filter receipts
    const filteredReceipts = receipts.filter(r => {
        const matchesSearch = r.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Calculate totals
    const totalAmount = receipts.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
    const greyAreaCount = receipts.filter(r => r.isGreyArea).length;
    const withAttachments = receipts.filter(r => r.attachmentName).length;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Receipts</h1>
                        <p className="text-text-secondary mt-1">
                            Manage your expense receipts for FY {currentFinancialYear}
                        </p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4" />
                        Add Receipt
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        title="TOTAL RECEIPTS"
                        value={receipts.length.toString()}
                        icon={<ReceiptIcon className="w-5 h-5 text-accent" />}
                        iconBgColor="bg-accent/20"
                    />
                    <StatCard
                        title="TOTAL AMOUNT"
                        value={`$${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
                        icon={<FileText className="w-5 h-5 text-success" />}
                        iconBgColor="bg-success/20"
                    />
                    <StatCard
                        title="GREY AREA ITEMS"
                        value={greyAreaCount.toString()}
                        subtitle="May require review"
                        icon={<AlertTriangle className="w-5 h-5 text-warning" />}
                        iconBgColor="bg-warning/20"
                    />
                    <StatCard
                        title="WITH ATTACHMENTS"
                        value={withAttachments.toString()}
                        icon={<Upload className="w-5 h-5 text-info" />}
                        iconBgColor="bg-info/20"
                    />
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search by vendor or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-background-elevated border border-border text-text-primary placeholder:text-text-muted"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-text-muted" />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | 'all')}
                            className="px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                        >
                            <option value="all">All Categories</option>
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Receipts Table */}
                <Card>
                    <CardHeader
                        title="Receipt List"
                        subtitle={`Showing ${filteredReceipts.length} of ${receipts.length} receipts`}
                    />
                    <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-background-secondary">
                                <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Vendor</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3">Attachment</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                                            No receipts found. Click "Add Receipt" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReceipts.map((receipt) => (
                                        <tr key={receipt.id} className="border-t border-border hover:bg-background-elevated">
                                            <td className="px-4 py-3 text-text-secondary">
                                                {new Date(receipt.date).toLocaleDateString('en-AU')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-text-primary font-medium">{receipt.vendor}</span>
                                                    {receipt.isGreyArea && (
                                                        <AlertTriangle className="w-4 h-4 text-warning" />
                                                    )}
                                                </div>
                                                {receipt.description && (
                                                    <p className="text-xs text-text-muted mt-0.5">{receipt.description}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${receipt.isGreyArea
                                                    ? 'bg-warning/20 text-warning'
                                                    : 'bg-accent/20 text-accent'
                                                    }`}>
                                                    {CATEGORY_LABELS[receipt.category]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                ${parseFloat(receipt.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3">
                                                {receipt.attachmentName ? (
                                                    <span className="text-xs text-accent">{receipt.attachmentName}</span>
                                                ) : (
                                                    <span className="text-xs text-text-muted">None</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => receipt.id && handleDelete(receipt.id)}
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

            {/* Add Receipt Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background-card rounded-xl border border-border p-6 w-full max-w-lg shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text-primary">Add Receipt</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 rounded hover:bg-background-elevated"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="VENDOR"
                                    placeholder="e.g. Officeworks"
                                    value={formData.vendor}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setFormData(prev => ({ ...prev, vendor: e.target.value }))
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="AMOUNT"
                                    type="number"
                                    placeholder="0.00"
                                    leftIcon={<span className="text-text-muted">$</span>}
                                    value={formData.amount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setFormData(prev => ({ ...prev, amount: e.target.value }))
                                    }
                                />
                                <div>
                                    <label className="block text-xs text-text-muted mb-1.5">CATEGORY</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                                        className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                                    >
                                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Grey Area Warning */}
                            {GREY_AREA_CATEGORIES.includes(formData.category) && (
                                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-warning">Grey Area Deduction</p>
                                        <p className="text-text-secondary mt-1">
                                            This category may be subject to additional ATO scrutiny. Ensure you have proper documentation.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Input
                                label="DESCRIPTION"
                                placeholder="What was this expense for?"
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, description: e.target.value }))
                                }
                            />

                            {/* File Upload */}
                            <div>
                                <label className="block text-xs text-text-muted mb-1.5">ATTACHMENT</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-4 border-2 border-dashed border-border rounded-lg flex flex-col items-center gap-2 hover:border-accent hover:bg-accent/5 transition-colors"
                                >
                                    {formData.attachment ? (
                                        <>
                                            <FileText className="w-8 h-8 text-accent" />
                                            <span className="text-sm text-text-primary">{formData.attachment.name}</span>
                                            <span className="text-xs text-text-muted">Click to change</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-text-muted" />
                                            <span className="text-sm text-text-secondary">Upload receipt image or PDF</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button onClick={handleAddReceipt} className="flex-1">
                                Save Receipt
                            </Button>
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
