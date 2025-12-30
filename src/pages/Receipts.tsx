import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Plus, Receipt as ReceiptIcon, Upload, X, AlertTriangle,
    Search, Filter, Trash2, FileText, Edit2
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { db } from '../database/db';
import type { Receipt, ExpenseCategory } from '../types';
import Decimal from 'decimal.js';
import { compressImage } from '../utils/imageUtils';

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
    const { currentFinancialYear, isInitialized, initialize, refreshDashboard, currentProfileId } = useTaxFlowStore();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null; vendor: string }>({
        isOpen: false, id: null, vendor: ''
    });
    const [isCompressing, setIsCompressing] = useState(false);

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
                    .filter(r => r.profileId === currentProfileId)
                    .toArray();
                setReceipts(recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error('Failed to load receipts:', error);
            }
        };
        loadReceipts();
    }, [currentFinancialYear, currentProfileId]);

    // Add or Update receipt
    const handleSaveReceipt = async () => {
        if (!formData.vendor || !formData.amount || !currentProfileId) return;

        const isGreyArea = GREY_AREA_CATEGORIES.includes(formData.category);

        const receiptData: Partial<Receipt> = {
            profileId: currentProfileId,
            financialYear: currentFinancialYear,
            date: formData.date ? new Date(formData.date) : new Date(),
            vendor: formData.vendor,
            amount: formData.amount,
            category: formData.category,
            description: formData.description,
            isGreyArea,
        };

        // Handle file attachment
        if (formData.attachment) {
            receiptData.attachmentBlob = formData.attachment;
            receiptData.attachmentName = formData.attachment.name;
            receiptData.attachmentType = formData.attachment.type;
        }

        if (editingId) {
            await db.receipts.update(editingId, receiptData);
        } else {
            await db.receipts.add({ ...receiptData, createdAt: new Date() } as Receipt);
        }

        // Reload lists and refresh dashboard stats
        const recs = await db.receipts
            .where('financialYear')
            .equals(currentFinancialYear)
            .filter(r => r.profileId === currentProfileId)
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
        setEditingId(null);
        setShowAddModal(false);
    };

    // Edit receipt
    const handleEdit = (receipt: Receipt) => {
        setFormData({
            date: new Date(receipt.date).toISOString().split('T')[0],
            vendor: receipt.vendor,
            amount: receipt.amount,
            category: receipt.category,
            description: receipt.description || '',
            attachment: null,
        });
        setEditingId(receipt.id || null);
        setShowAddModal(true);
    };

    // Show delete confirmation
    const handleDelete = (receipt: Receipt) => {
        setDeleteConfirm({
            isOpen: true,
            id: receipt.id || null,
            vendor: receipt.vendor
        });
    };

    // Actually delete after confirmation
    const confirmDelete = async () => {
        if (deleteConfirm.id) {
            await db.receipts.delete(deleteConfirm.id);
            setReceipts(prev => prev.filter(r => r.id !== deleteConfirm.id));
            await refreshDashboard();
        }
        setDeleteConfirm({ isOpen: false, id: null, vendor: '' });
    };

    // File Validation Constants
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit for PDFs
    const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input value to allow re-selecting same file if needed
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Validate type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            alert('Invalid file type. Please upload a JPG, PNG, WebP image or PDF.');
            return;
        }

        // Handle PDFs (Strict 5MB limit, no compression)
        if (file.type === 'application/pdf') {
            if (file.size > MAX_FILE_SIZE) {
                alert(`PDF is too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
                return;
            }
            setFormData(prev => ({ ...prev, attachment: file }));
            return;
        }

        // Handle Images (Auto-compress if needed)
        try {
            setIsCompressing(true);
            const compressedFile = await compressImage(file);
            setFormData(prev => ({ ...prev, attachment: compressedFile }));
        } catch (error) {
            console.error('Compression failed:', error);
            alert('Failed to process image. Please try a different file.');
        } finally {
            setIsCompressing(false);
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
    const totalAmount = receipts.reduce((sum, r) => sum.add(r.amount || 0), new Decimal(0));
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="TOTAL RECEIPTS"
                        value={receipts.length.toString()}
                        icon={<ReceiptIcon className="w-5 h-5 text-accent" />}
                        iconBgColor="bg-accent/20"
                    />
                    <StatCard
                        title="TOTAL AMOUNT"
                        value={`$${totalAmount.toNumber().toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
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
                <div className="flex flex-col sm:flex-row gap-4">
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
                                            <td className="px-4 py-3 flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleEdit(receipt)}
                                                    className="p-1 rounded hover:bg-accent/20 text-text-muted hover:text-accent transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(receipt)}
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

            {/* Add/Edit Receipt Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background-card rounded-xl border border-border p-6 w-full max-w-lg shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text-primary">
                                {editingId ? 'Edit Receipt' : 'Add Receipt'}
                            </h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 rounded hover:bg-background-elevated"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    onClick={() => !isCompressing && fileInputRef.current?.click()}
                                    disabled={isCompressing}
                                    className={`w-full p-4 border-2 border-dashed border-border rounded-lg flex flex-col items-center gap-2 transition-colors ${isCompressing ? 'opacity-50 cursor-wait' : 'hover:border-accent hover:bg-accent/5'}`}
                                >
                                    {isCompressing ? (
                                        <>
                                            <Upload className="w-8 h-8 text-accent animate-pulse" />
                                            <span className="text-sm text-text-primary">Compressing image...</span>
                                            <span className="text-xs text-text-muted">Please wait</span>
                                        </>
                                    ) : formData.attachment ? (
                                        <>
                                            <FileText className="w-8 h-8 text-accent" />
                                            <span className="text-sm text-text-primary">{formData.attachment.name}</span>
                                            <span className="text-xs text-text-muted">
                                                {(formData.attachment.size / 1024).toFixed(1)} KB • Click to change
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-text-muted" />
                                            <span className="text-sm text-text-secondary">Upload receipt image or PDF</span>
                                            <span className="text-[10px] text-text-muted mt-1">Images auto-compressed • Max 5MB PDF</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button onClick={handleSaveReceipt} className="flex-1">
                                    {editingId ? 'Update Receipt' : 'Save Receipt'}
                                </Button>
                                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Delete Receipt"
                message={`Are you sure you want to delete the receipt from "${deleteConfirm.vendor}"? This action cannot be undone.`}
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, id: null, vendor: '' })}
            />
        </DashboardLayout>
    );
}
