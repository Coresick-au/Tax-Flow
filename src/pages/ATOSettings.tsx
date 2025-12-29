import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    Calculator, DollarSign, Car, Utensils, HelpCircle, Plus, Minus, Save, Check,
    Scale
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import type { TaxBracket, TaxSettings as TaxSettingsType } from '../types';

export function ATOSettings() {
    const {
        currentFinancialYear,
        taxSettings,
        setTaxSettings
    } = useTaxFlowStore();

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

    // Local state for tax settings editing
    const [editedBrackets, setEditedBrackets] = useState<TaxBracket[]>([]);
    const [wfhRate, setWfhRate] = useState('');
    const [vehicleRate, setVehicleRate] = useState('');
    const [mealAllowance, setMealAllowance] = useState('');

    // Initialize local state from taxSettings
    useEffect(() => {
        if (taxSettings) {
            setEditedBrackets(taxSettings.taxBrackets || []);
            setWfhRate(taxSettings.wfhFixedRate || '0.67');
            setVehicleRate(taxSettings.vehicleCentsPerKm || '85');
            setMealAllowance(taxSettings.mealAllowance || '36.40');
        }
    }, [taxSettings]);

    // Save tax settings
    const handleSaveTaxSettings = async () => {
        if (!taxSettings) return;

        setSaveStatus('saving');
        try {
            const updatedSettings: TaxSettingsType = {
                ...taxSettings,
                taxBrackets: editedBrackets,
                wfhFixedRate: wfhRate,
                vehicleCentsPerKm: vehicleRate,
                mealAllowance: mealAllowance,
            };
            await setTaxSettings(updatedSettings);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to save tax settings:', error);
            setSaveStatus('idle');
        }
    };

    // Add a new tax bracket
    const handleAddBracket = () => {
        const lastBracket = editedBrackets[editedBrackets.length - 1];
        const newMinIncome = lastBracket ? (lastBracket.maxIncome || 0) + 1 : 0;
        setEditedBrackets([
            ...editedBrackets,
            {
                minIncome: newMinIncome,
                maxIncome: null,
                rate: 0,
                baseTax: 0,
            },
        ]);
    };

    // Remove a tax bracket
    const handleRemoveBracket = (index: number) => {
        setEditedBrackets(editedBrackets.filter((_, i) => i !== index));
    };

    // Update a tax bracket
    const handleUpdateBracket = (index: number, field: keyof TaxBracket, value: string) => {
        const updated = [...editedBrackets];
        if (field === 'maxIncome' && value === '') {
            updated[index] = { ...updated[index], [field]: null };
        } else {
            updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
        }
        setEditedBrackets(updated);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                        <Scale className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">ATO Settings</h1>
                        <p className="text-text-secondary">Tax rates and thresholds for FY {currentFinancialYear}</p>
                    </div>
                </div>

                {/* Tax Brackets */}
                <Card>
                    <CardHeader
                        title="Income Tax Brackets"
                        subtitle="Configure marginal tax rates for accurate calculations"
                    />

                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-accent" />
                                <span className="font-medium text-text-primary">Tax Brackets</span>
                                <div className="relative group">
                                    <HelpCircle className="w-4 h-4 text-text-muted cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-background-elevated border border-border rounded-lg shadow-lg text-sm z-10">
                                        <p className="text-text-secondary mb-2">Search ATO for current rates:</p>
                                        <p className="text-accent font-mono text-xs">"individual income tax rates"</p>
                                    </div>
                                </div>
                            </div>
                            <Button variant="secondary" onClick={handleAddBracket}>
                                <Plus className="w-4 h-4" /> Add Bracket
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 px-3 text-text-muted font-medium">Min Income</th>
                                        <th className="text-left py-2 px-3 text-text-muted font-medium">Max Income</th>
                                        <th className="text-left py-2 px-3 text-text-muted font-medium">Rate (%)</th>
                                        <th className="text-left py-2 px-3 text-text-muted font-medium">Base Tax</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editedBrackets.map((bracket, index) => (
                                        <tr key={index} className="border-b border-border-muted">
                                            <td className="py-2 px-3">
                                                <input
                                                    type="number"
                                                    value={bracket.minIncome}
                                                    onChange={(e) => handleUpdateBracket(index, 'minIncome', e.target.value)}
                                                    className="w-28 px-2 py-1 bg-background-elevated border border-border rounded text-text-primary"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="number"
                                                    value={bracket.maxIncome ?? ''}
                                                    placeholder="∞"
                                                    onChange={(e) => handleUpdateBracket(index, 'maxIncome', e.target.value)}
                                                    className="w-28 px-2 py-1 bg-background-elevated border border-border rounded text-text-primary placeholder:text-text-muted"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={bracket.rate}
                                                    onChange={(e) => handleUpdateBracket(index, 'rate', e.target.value)}
                                                    className="w-20 px-2 py-1 bg-background-elevated border border-border rounded text-text-primary"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="number"
                                                    value={bracket.baseTax}
                                                    onChange={(e) => handleUpdateBracket(index, 'baseTax', e.target.value)}
                                                    className="w-28 px-2 py-1 bg-background-elevated border border-border rounded text-text-primary"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                {editedBrackets.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveBracket(index)}
                                                        className="p-1 text-text-muted hover:text-danger transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>

                {/* Deduction Rates */}
                <Card>
                    <CardHeader
                        title="Deduction Rates"
                        subtitle="ATO fixed rates for common deduction methods"
                    />

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-primary" />
                                <label className="text-sm font-medium text-text-primary">WFH Rate ($/hr)</label>
                                <div className="relative group">
                                    <HelpCircle className="w-3 h-3 text-text-muted cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-background-elevated border border-border rounded-lg shadow-lg text-xs z-10">
                                        <p className="text-text-secondary">Search: <span className="text-accent font-mono">"working from home fixed rate"</span></p>
                                    </div>
                                </div>
                            </div>
                            <Input
                                type="number"
                                step="0.01"
                                value={wfhRate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWfhRate(e.target.value)}
                                leftIcon={<span className="text-text-muted">$</span>}
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Car className="w-4 h-4 text-info" />
                                <label className="text-sm font-medium text-text-primary">Vehicle (¢/km)</label>
                                <div className="relative group">
                                    <HelpCircle className="w-3 h-3 text-text-muted cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-background-elevated border border-border rounded-lg shadow-lg text-xs z-10">
                                        <p className="text-text-secondary">Search: <span className="text-accent font-mono">"cents per kilometre method"</span></p>
                                    </div>
                                </div>
                            </div>
                            <Input
                                type="number"
                                step="1"
                                value={vehicleRate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicleRate(e.target.value)}
                                rightIcon={<span className="text-text-muted">¢</span>}
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Utensils className="w-4 h-4 text-warning" />
                                <label className="text-sm font-medium text-text-primary">Meal Allowance</label>
                                <div className="relative group">
                                    <HelpCircle className="w-3 h-3 text-text-muted cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-background-elevated border border-border rounded-lg shadow-lg text-xs z-10">
                                        <p className="text-text-secondary">Search: <span className="text-accent font-mono">"reasonable overtime meal allowance"</span></p>
                                    </div>
                                </div>
                            </div>
                            <Input
                                type="number"
                                step="0.01"
                                value={mealAllowance}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMealAllowance(e.target.value)}
                                leftIcon={<span className="text-text-muted">$</span>}
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <Button onClick={handleSaveTaxSettings} className="w-full">
                        {saveStatus === 'saving' ? (
                            <>Saving...</>
                        ) : saveStatus === 'success' ? (
                            <>
                                <Check className="w-4 h-4" />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save ATO Settings
                            </>
                        )}
                    </Button>
                </Card>
            </div>
        </DashboardLayout>
    );
}
