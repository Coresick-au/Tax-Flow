import { useEffect, useState } from 'react';
import { X, Building2, Briefcase, Trash2 } from 'lucide-react';
import { useTaxFlowStore } from '../../stores/taxFlowStore';
import { db } from '../../database/db';
import { Decimal } from 'decimal.js';
import { formatCurrency } from '../../utils/format';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// ----------------------------------------------------------------------
// Taxable Income Modal
// ----------------------------------------------------------------------
export function TaxableIncomeModal({ isOpen, onClose }: ModalProps) {
    const { currentFinancialYear, currentProfileId } = useTaxFlowStore();
    const [incomeItems, setIncomeItems] = useState<{
        category: string;
        description: string;
        amount: Decimal;
        icon: any;
        type?: 'property';
        propertyId?: number;
        fullAmount?: Decimal;
        ownershipPct?: number;
    }[]>([]);
    const [total, setTotal] = useState<Decimal>(new Decimal(0));

    const fetchData = async () => {
        const items: typeof incomeItems = [];
        let totalAmount = new Decimal(0);

        // 1. Salary/Wages Income
        const salaryRecords = await db.income
            .where('financialYear').equals(currentFinancialYear)
            .filter(i => !i.profileId || i.profileId === currentProfileId)
            .toArray();

        salaryRecords.forEach(r => {
            const amt = new Decimal(r.amount);
            items.push({
                category: 'Employment',
                description: r.description || r.payer || 'Income',
                amount: amt,
                icon: Briefcase
            });
            totalAmount = totalAmount.add(amt);
        });

        // 2. Rental Income
        const rentalRecords = await db.propertyIncome
            .where('financialYear').equals(currentFinancialYear)
            .filter(i => !i.profileId || i.profileId === currentProfileId)
            .toArray();

        const properties = await db.properties.toArray();
        const rentalByProperty = new Map<number, { fullAmount: Decimal; claimableAmount: Decimal; address: string; ownershipPct: number }>();

        rentalRecords.forEach(r => {
            const prop = properties.find(p => p.id === r.propertyId);
            const address = prop ? prop.address : `Unknown Property (ID: ${r.propertyId})`;
            const ownershipPct = prop?.ownershipSplit?.[0]?.percentage ?? 100;
            const ownershipFraction = ownershipPct / 100;

            const fullAmt = new Decimal(r.grossRent).add(new Decimal(r.otherIncome || 0));
            const claimableAmt = fullAmt.mul(ownershipFraction);

            if (rentalByProperty.has(r.propertyId)) {
                const existing = rentalByProperty.get(r.propertyId)!;
                existing.fullAmount = existing.fullAmount.add(fullAmt);
                existing.claimableAmount = existing.claimableAmount.add(claimableAmt);
            } else {
                rentalByProperty.set(r.propertyId, {
                    fullAmount: fullAmt,
                    claimableAmount: claimableAmt,
                    address,
                    ownershipPct
                });
            }
        });

        rentalByProperty.forEach((data, id) => {
            items.push({
                category: 'Property',
                description: data.address,
                amount: data.claimableAmount,
                icon: Building2,
                type: 'property',
                propertyId: id,
                fullAmount: data.fullAmount,
                ownershipPct: data.ownershipPct
            });
            totalAmount = totalAmount.add(data.claimableAmount);
        });

        setIncomeItems(items);
        setTotal(totalAmount);
    };

    useEffect(() => {
        if (!isOpen) return;
        fetchData();
    }, [isOpen, currentFinancialYear, currentProfileId]);

    const handleDelete = async (propertyId: number) => {
        if (confirm('Are you sure you want to delete all income records for this property? This cannot be undone.')) {
            await db.propertyIncome
                .where('propertyId').equals(propertyId)
                .filter(i => i.financialYear === currentFinancialYear)
                .delete();
            fetchData();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-lg">Income Breakdown</h3>
                    <button onClick={onClose} className="p-1 hover:bg-background-elevated rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                    <div className="text-center py-4 bg-background-elevated rounded-lg mb-4">
                        <p className="text-sm text-text-secondary">Total Gross Income</p>
                        <p className="text-3xl font-bold text-success">{formatCurrency(total.toNumber())}</p>
                    </div>

                    <div className="space-y-3">
                        {incomeItems.length === 0 ? (
                            <p className="text-center text-text-muted">No income records found.</p>
                        ) : (
                            incomeItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border-muted hover:bg-background-elevated transition-colors group">
                                    <div className="p-2 rounded-full bg-success/10 text-success">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.description}</p>
                                        <p className="text-xs text-text-muted">{item.category}</p>
                                        {item.type === 'property' && item.fullAmount && item.ownershipPct !== 100 && (
                                            <div className="text-xs text-text-muted mt-1 space-y-0.5">
                                                <div className="flex justify-between">
                                                    <span>Full Property:</span>
                                                    <span className="font-mono">{formatCurrency(item.fullAmount.toNumber())}</span>
                                                </div>
                                                <div className="flex justify-between font-medium text-success">
                                                    <span>Your {item.ownershipPct}% Share:</span>
                                                    <span className="font-mono">{formatCurrency(item.amount.toNumber())}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.type !== 'property' || item.ownershipPct === 100 ? (
                                            <span className="font-mono font-medium text-success">
                                                {formatCurrency(item.amount.toNumber())}
                                            </span>
                                        ) : null}
                                        {item.type === 'property' && item.propertyId !== undefined && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item.propertyId!);
                                                }}
                                                className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete all records for this property"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Tax Liability Modal
// ----------------------------------------------------------------------
export function TaxLiabilityModal({ isOpen, onClose }: ModalProps) {
    const { estimatedTaxableIncome, estimatedTaxPayable, taxSettings } = useTaxFlowStore();

    // Simple breakdown visualization
    const taxableParam = estimatedTaxableIncome.toNumber();
    const payableParam = estimatedTaxPayable.toNumber();

    // REMOVED: Unused 'baseTax' variable was here.

    useEffect(() => {
        if (!isOpen) return;
        const fetchWithheld = async () => {
            // Placeholder for future logic
        };
        fetchWithheld();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-lg">Tax Liability Breakdown</h3>
                    <button onClick={onClose} className="p-1 hover:bg-background-elevated rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-sm text-text-secondary">Estimated Tax Payable</p>
                        <p className={`text-4xl font-bold ${payableParam > 0 ? 'text-warning' : 'text-success'}`}>
                            {formatCurrency(payableParam)}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                            {payableParam > 0 ? 'You likely owe this amount' : 'Estimated refund amount'}
                        </p>
                    </div>

                    <div className="space-y-2 text-sm border-t border-border pt-4">
                        <div className="flex justify-between">
                            <span className="text-text-secondary">Taxable Income</span>
                            <span className="font-medium">{formatCurrency(taxableParam)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-text-secondary">Estimated Tax on Income</span>
                            <span className="font-medium text-warning">
                                {formatCurrency(payableParam)}
                            </span>
                        </div>
                        {!taxSettings?.hasPrivateHealthInsurance && (
                            <div className="p-2 bg-accent/10 rounded text-xs text-accent mt-2">
                                <p>Note: This includes Medicare Levy estimate. Actual tax may vary based on offsets and surcharges.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Total Deductions Modal
// ----------------------------------------------------------------------
export function TotalDeductionsModal({ isOpen, onClose }: ModalProps) {
    const { currentFinancialYear, currentProfileId } = useTaxFlowStore();
    const [items, setItems] = useState<{
        category: string;
        description?: string;
        amount: Decimal;
        fullAmount?: Decimal;
        ownershipPct?: number;
    }[]>([]);
    const [total, setTotal] = useState<Decimal>(new Decimal(0));

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            const tempItems: { category: string; description?: string; amount: Decimal; fullAmount?: Decimal; ownershipPct?: number }[] = [];
            let totalAmount = new Decimal(0);

            // 1. General Receipts
            const receipts = await db.receipts
                .where('financialYear').equals(currentFinancialYear)
                .filter(r => !r.profileId || r.profileId === currentProfileId)
                .toArray();

            const receiptTotal = receipts.reduce((sum, r) => sum.add(new Decimal(r.amount)), new Decimal(0));
            if (!receiptTotal.isZero()) {
                tempItems.push({ category: 'General Receipts', amount: receiptTotal });
                totalAmount = totalAmount.add(receiptTotal);
            }

            // 3. Property Expenses
            const propExp = await db.propertyExpenses
                .where('financialYear').equals(currentFinancialYear)
                .filter(e => !e.profileId || e.profileId === currentProfileId)
                .toArray();

            const properties = await db.properties.toArray();
            const expByProperty = new Map<number, { fullAmount: Decimal; claimableAmount: Decimal; address: string; ownershipPct: number }>();

            propExp.forEach(e => {
                const prop = properties.find(p => p.id === e.propertyId);
                const address = prop ? prop.address : `Unknown Property (ID: ${e.propertyId})`;
                const ownershipPct = prop?.ownershipSplit?.[0]?.percentage ?? 100;
                const ownershipFraction = ownershipPct / 100;

                const fullAmt = new Decimal(e.amount);
                const claimableAmt = fullAmt.mul(ownershipFraction);

                if (expByProperty.has(e.propertyId)) {
                    const existing = expByProperty.get(e.propertyId)!;
                    existing.fullAmount = existing.fullAmount.add(fullAmt);
                    existing.claimableAmount = existing.claimableAmount.add(claimableAmt);
                } else {
                    expByProperty.set(e.propertyId, {
                        fullAmount: fullAmt,
                        claimableAmount: claimableAmt,
                        address,
                        ownershipPct
                    });
                }
            });

            expByProperty.forEach((data, _id) => {
                tempItems.push({
                    category: 'Property Expenses',
                    description: data.address,
                    amount: data.claimableAmount,
                    fullAmount: data.fullAmount,
                    ownershipPct: data.ownershipPct
                });
                totalAmount = totalAmount.add(data.claimableAmount);
            });

            setItems(tempItems);
            setTotal(totalAmount);
        };
        fetchData();
    }, [isOpen, currentFinancialYear, currentProfileId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-lg">Deductions Breakdown</h3>
                    <button onClick={onClose} className="p-1 hover:bg-background-elevated rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                    <div className="text-center py-4 bg-background-elevated rounded-lg mb-4">
                        <p className="text-sm text-text-secondary">Total Deductions</p>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(total.toNumber())}</p>
                    </div>

                    <div className="space-y-3">
                        {items.length === 0 ? (
                            <p className="text-center text-text-muted">No deductions recorded.</p>
                        ) : (
                            items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border-muted">
                                    <div className="flex flex-col flex-1">
                                        <span className="font-medium text-sm text-text-primary">{item.category}</span>
                                        {item.description && (
                                            <span className="text-xs text-text-secondary mt-0.5">{item.description}</span>
                                        )}
                                        {item.category === 'Property Expenses' && item.fullAmount && item.ownershipPct !== 100 && (
                                            <div className="text-xs text-text-muted mt-1 space-y-0.5">
                                                <div className="flex justify-between">
                                                    <span>Full Property:</span>
                                                    <span className="font-mono">{formatCurrency(item.fullAmount.toNumber())}</span>
                                                </div>
                                                <div className="flex justify-between font-medium text-primary">
                                                    <span>Your {item.ownershipPct}% Share:</span>
                                                    <span className="font-mono">{formatCurrency(item.amount.toNumber())}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {item.category !== 'Property Expenses' || item.ownershipPct === 100 ? (
                                        <span className="font-mono font-medium text-primary">
                                            {item.amount.isZero() ? 'View Details' : formatCurrency(item.amount.toNumber())}
                                        </span>
                                    ) : null}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
