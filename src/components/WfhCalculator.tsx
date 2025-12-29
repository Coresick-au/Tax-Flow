import { useState } from 'react';
import { Info, Calculator, AlertCircle } from 'lucide-react';
import { Card, CardHeader, Button, Input, Select } from './ui';
import {
    calculateWfhDeduction,
    validateWfhHours,
    type WfhMethod,
    type ActualCostInputs,
    type WfhCalculationResult,
} from '../utils/wfhCalculator';
import type { TaxSettings } from '../types';

interface WfhCalculatorProps {
    taxSettings: TaxSettings;
    onSave?: (result: WfhCalculationResult) => void;
}

export function WfhCalculator({ taxSettings, onSave }: WfhCalculatorProps) {
    const [method, setMethod] = useState<WfhMethod>('fixed_rate');
    const [totalHours, setTotalHours] = useState<string>('');
    const [workUsePercentage, setWorkUsePercentage] = useState<string>('100');
    const [actualCosts, setActualCosts] = useState<ActualCostInputs>({
        electricity: '',
        internet: '',
        cleaning: '',
        phoneUsage: '',
        stationery: '',
        furnitureDepreciation: '',
    });
    const [result, setResult] = useState<WfhCalculationResult | null>(null);
    const [hoursWarning, setHoursWarning] = useState<string | undefined>();

    const handleCalculate = () => {
        const hours = parseInt(totalHours) || 0;
        const workUse = parseInt(workUsePercentage) || 100;

        const validation = validateWfhHours(hours);
        if (!validation.valid) {
            setHoursWarning(validation.message);
            return;
        }
        setHoursWarning(validation.message);

        const calcResult = calculateWfhDeduction(
            method,
            hours,
            method === 'actual_cost' ? actualCosts : null,
            workUse,
            taxSettings
        );

        setResult(calcResult);
    };

    const handleSave = () => {
        if (result && onSave) {
            onSave(result);
        }
    };

    const updateActualCost = (field: keyof ActualCostInputs, value: string) => {
        setActualCosts(prev => ({ ...prev, [field]: value }));
        setResult(null);
    };

    const fixedRateClass = method === 'fixed_rate'
        ? 'border-accent bg-accent/10 ring-2 ring-accent'
        : 'border-border hover:border-primary';

    const actualCostClass = method === 'actual_cost'
        ? 'border-accent bg-accent/10 ring-2 ring-accent'
        : 'border-border hover:border-primary';

    return (
        <Card className="max-w-2xl">
            <CardHeader
                title="Work From Home Calculator"
                subtitle="Calculate your WFH deduction using ATO-approved methods"
                action={
                    <div className="text-sm text-text-muted flex items-center gap-1">
                        <Info className="w-4 h-4" />
                        FY {taxSettings.financialYear}
                    </div>
                }
            />

            {/* Method Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                    Calculation Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => { setMethod('fixed_rate'); setResult(null); }}
                        className={`p-4 rounded-lg border text-left transition-all ${fixedRateClass}`}
                    >
                        <div className="font-medium text-text-primary">Fixed Rate</div>
                        <div className="text-sm text-text-secondary mt-1">
                            ${taxSettings.wfhFixedRate}/hour • Simple tracking
                        </div>
                    </button>
                    <button
                        onClick={() => { setMethod('actual_cost'); setResult(null); }}
                        className={`p-4 rounded-lg border text-left transition-all ${actualCostClass}`}
                    >
                        <div className="font-medium text-text-primary">Actual Cost</div>
                        <div className="text-sm text-text-secondary mt-1">
                            Record actual expenses • Higher deductions possible
                        </div>
                    </button>
                </div>
            </div>

            {/* Fixed Rate Inputs */}
            {method === 'fixed_rate' && (
                <div className="space-y-4 mb-6">
                    <Input
                        label="Total WFH Hours (for the year)"
                        type="number"
                        placeholder="e.g., 1200"
                        value={totalHours}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setTotalHours(e.target.value); setResult(null); }}
                        error={hoursWarning && !validateWfhHours(parseInt(totalHours) || 0).valid ? hoursWarning : undefined}
                        hint={`Rate: $${taxSettings.wfhFixedRate} per hour. Covers electricity, phone, internet, stationery.`}
                    />
                    {hoursWarning && validateWfhHours(parseInt(totalHours) || 0).valid && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{hoursWarning}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Actual Cost Inputs */}
            {method === 'actual_cost' && (
                <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Electricity ($)"
                            type="number"
                            placeholder="0.00"
                            value={actualCosts.electricity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateActualCost('electricity', e.target.value)}
                            hint="Heating, cooling, lighting for home office"
                        />
                        <Input
                            label="Internet ($)"
                            type="number"
                            placeholder="0.00"
                            value={actualCosts.internet}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateActualCost('internet', e.target.value)}
                            hint="Annual internet costs"
                        />
                        <Input
                            label="Phone Usage ($)"
                            type="number"
                            placeholder="0.00"
                            value={actualCosts.phoneUsage}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateActualCost('phoneUsage', e.target.value)}
                            hint="Work-related phone usage"
                        />
                        <Input
                            label="Cleaning ($)"
                            type="number"
                            placeholder="0.00"
                            value={actualCosts.cleaning}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateActualCost('cleaning', e.target.value)}
                            hint="Cleaning costs for home office area"
                        />
                        <Input
                            label="Stationery ($)"
                            type="number"
                            placeholder="0.00"
                            value={actualCosts.stationery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateActualCost('stationery', e.target.value)}
                            hint="Paper, pens, printer ink, etc."
                        />
                        <Input
                            label="Furniture Depreciation ($)"
                            type="number"
                            placeholder="0.00"
                            value={actualCosts.furnitureDepreciation}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateActualCost('furnitureDepreciation', e.target.value)}
                            hint="Decline in value of office furniture"
                        />
                    </div>
                    <Select
                        label="Work Use Percentage"
                        value={workUsePercentage}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setWorkUsePercentage(e.target.value); setResult(null); }}
                        options={[
                            { value: '100', label: '100% - Dedicated home office' },
                            { value: '75', label: '75% - Mostly work use' },
                            { value: '50', label: '50% - Equal work/personal use' },
                            { value: '25', label: '25% - Occasional work use' },
                        ]}
                        hint="Percentage of expenses attributable to work"
                    />
                </div>
            )}

            {/* Calculate Button */}
            <Button onClick={handleCalculate} className="w-full mb-4">
                <Calculator className="w-4 h-4" />
                Calculate Deduction
            </Button>

            {/* Result */}
            {result && (
                <div className="p-4 rounded-lg bg-background-elevated border border-accent/30">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-text-secondary">Total WFH Deduction</span>
                        <span className="text-2xl font-bold text-accent">
                            ${result.totalDeduction.toFixed(2)}
                        </span>
                    </div>

                    {result.breakdown.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-border">
                            {result.breakdown.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                    <span className="text-text-secondary">{item.label}</span>
                                    <span className="text-text-primary">${item.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {onSave && (
                        <Button
                            variant="secondary"
                            onClick={handleSave}
                            className="w-full mt-4"
                        >
                            Save to Deductions
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );
}
