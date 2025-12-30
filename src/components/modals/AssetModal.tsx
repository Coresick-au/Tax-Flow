import { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { Button, Input } from '../ui';
import { db } from '../../database/db';
import type { DepreciableAsset } from '../../types';

interface AssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    currentFinancialYear: string;
    currentProfileId: string | null;
}

export function AssetModal({ isOpen, onClose, onSave, currentFinancialYear, currentProfileId }: AssetModalProps) {
    // const { currentFinancialYear, refreshDashboard } = useTaxFlowStore();

    const [formData, setFormData] = useState({
        itemName: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        cost: '',
        method: 'diminishing_value' as 'diminishing_value' | 'prime_cost',
        effectiveLife: '',
        workUsePercentage: '100',
    });

    const handleSave = async () => {
        if (!formData.itemName || !formData.cost || !formData.purchaseDate || !formData.effectiveLife) return;

        try {
            const assetData: Omit<DepreciableAsset, 'id'> = {
                profileId: currentProfileId || undefined,
                financialYear: currentFinancialYear,
                itemName: formData.itemName,
                purchaseDate: new Date(formData.purchaseDate),
                cost: formData.cost,
                method: formData.method,
                effectiveLifeYears: parseFloat(formData.effectiveLife),
                workUsePercentage: parseFloat(formData.workUsePercentage),
                createdAt: new Date(),
            };

            await db.depreciableAssets.add(assetData);
            // await refreshDashboard();
            onSave();
            onClose();

            // Reset form
            setFormData({
                itemName: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                cost: '',
                method: 'diminishing_value',
                effectiveLife: '',
                workUsePercentage: '100',
            });
        } catch (error) {
            console.error('Failed to save asset:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-background-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-xl font-bold text-text-primary">Add Depreciable Asset</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-background-elevated"
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <Input
                        label="ITEM NAME"
                        placeholder="e.g. MacBook Pro, Office Desk"
                        value={formData.itemName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData(prev => ({ ...prev, itemName: e.target.value }))
                        }
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="PURCHASE DATE"
                            type="date"
                            value={formData.purchaseDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))
                            }
                        />
                        <Input
                            label="COST"
                            type="number"
                            placeholder="0.00"
                            leftIcon={<span className="text-text-muted">$</span>}
                            value={formData.cost}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData(prev => ({ ...prev, cost: e.target.value }))
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-text-muted mb-1.5">METHOD</label>
                            <select
                                value={formData.method}
                                onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as any }))}
                                className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary"
                            >
                                <option value="diminishing_value">Diminishing Value</option>
                                <option value="prime_cost">Prime Cost</option>
                            </select>
                        </div>
                        <Input
                            label="EFFECTIVE LIFE (YEARS)"
                            type="number"
                            placeholder="e.g. 2"
                            value={formData.effectiveLife}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData(prev => ({ ...prev, effectiveLife: e.target.value }))
                            }
                        />
                    </div>

                    <Input
                        label="WORK USE PERCENTAGE"
                        type="number"
                        placeholder="100"
                        rightIcon={<span className="text-text-muted">%</span>}
                        value={formData.workUsePercentage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData(prev => ({ ...prev, workUsePercentage: e.target.value }))
                        }
                    />

                    <div className="p-3 bg-background-secondary rounded-lg text-sm text-text-secondary">
                        <div className="flex items-center gap-2 mb-1">
                            <HelpCircle className="w-4 h-4 text-info" />
                            <span className="font-medium text-text-primary">Depreciation Tip</span>
                        </div>
                        Assets under $300 (or $20,000 for small business instant asset write-off, check eligibility) may be immediately deductible instead of depreciated.
                    </div>

                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleSave} className="flex-1">
                            Save Asset
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
