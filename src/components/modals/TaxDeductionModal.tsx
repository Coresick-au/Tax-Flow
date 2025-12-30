import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle } from 'lucide-react';
import { Button, Input } from '../ui';
import { db } from '../../database/db';
import type { ExpenseCategory, Receipt } from '../../types';

interface TaxDeductionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    currentFinancialYear: string;
    currentProfileId: string | null;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    work_clothing: 'Work Clothing',
    tools_equipment: 'Tools & Equipment',
    self_education: 'Self Education',
    home_office: 'Home Office (Other)',
    car_expenses: 'Car Expenses',
    travel: 'Travel',
    professional_subscriptions: 'Subscriptions',
    union_fees: 'Union Fees',
    phone_internet: 'Phone / Internet',
    other: 'Other',
};

const GREY_AREA_CATEGORIES: ExpenseCategory[] = ['work_clothing', 'self_education', 'home_office', 'car_expenses'];

export function TaxDeductionModal({ isOpen, onClose, onSave, currentFinancialYear, currentProfileId }: TaxDeductionModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: 'other' as ExpenseCategory,
        description: '',
        attachment: null as File | null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, attachment: e.target.files![0] }));
        }
    };

    const handleSave = async () => {
        const newErrors: Record<string, string> = {};

        if (!formData.vendor.trim()) newErrors.vendor = 'Vendor is required';
        if (!formData.amount) newErrors.amount = 'Amount is required';
        else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be valid';
        if (!formData.date) newErrors.date = 'Date is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const receiptData: Omit<Receipt, 'id'> = {
                profileId: currentProfileId || '',
                financialYear: currentFinancialYear,
                date: new Date(formData.date),
                vendor: formData.vendor,
                category: formData.category,
                description: formData.description,
                amount: formData.amount,
                attachmentName: formData.attachment?.name,
                attachmentType: formData.attachment?.type,
                // Note: attachmentBlob would need simpler handling or separate extraction
                isGreyArea: GREY_AREA_CATEGORIES.includes(formData.category),
                createdAt: new Date(),
            };

            await db.receipts.add(receiptData);

            onSave();
            onClose();

            // Reset form
            setFormData({
                vendor: '',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                category: 'other',
                description: '',
                attachment: null,
            });
            setErrors({});
        } catch (error) {
            console.error('Failed to save deduction:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-background-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-xl font-bold text-text-primary">Add Deduction</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-background-elevated"
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="VENDOR / PAYEE"
                            placeholder="e.g. Officeworks"
                            value={formData.vendor}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setFormData(prev => ({ ...prev, vendor: e.target.value }));
                                if (errors.vendor) setErrors(prev => ({ ...prev, vendor: '' }));
                            }}
                            error={errors.vendor}
                        />
                        <Input
                            label="DATE"
                            type="date"
                            value={formData.date}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setFormData(prev => ({ ...prev, date: e.target.value }));
                                if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
                            }}
                            error={errors.date}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="AMOUNT"
                            type="number"
                            placeholder="0.00"
                            leftIcon={<span className="text-text-muted">$</span>}
                            value={formData.amount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setFormData(prev => ({ ...prev, amount: e.target.value }));
                                if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                            }}
                            error={errors.amount}
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

                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleSave} className="flex-1">
                            Save Deduction
                        </Button>
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
