import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sparkles, Copy, Check, Building2, Calendar, AlertCircle, X } from 'lucide-react';
import type { Property } from '../../types';

interface PropertyDepreciationHelperProps {
    property: Property;
    onClose: () => void;
}

export function PropertyDepreciationHelper({ property, onClose }: PropertyDepreciationHelperProps) {
    const [buildingAge, setBuildingAge] = useState('');
    const [buildingValue, setBuildingValue] = useState('');
    const [hasDepreciationSchedule, setHasDepreciationSchedule] = useState<'yes' | 'no' | 'unknown'>('unknown');
    const [scheduleDetails, setScheduleDetails] = useState('');
    const [copied, setCopied] = useState(false);

    const currentYear = new Date().getFullYear();
    const fyStart = new Date().getMonth() >= 6 ? currentYear : currentYear - 1;

    // Generate the AI prompt for property depreciation
    const generatePrompt = () => {
        const purchaseYear = property.purchaseDate ? new Date(property.purchaseDate).getFullYear() : '[YEAR]';
        const propertyAge = buildingAge || '[BUILDING AGE]';

        let prompt = `I need help understanding property depreciation for my Australian investment property tax return (FY ${fyStart}-${fyStart + 1}).

**Property Details:**
- Address: ${property.address}, ${property.suburb} ${property.state} ${property.postcode}
- Property Type: ${property.propertyType}
- Purchase Date: ${property.purchaseDate ? new Date(property.purchaseDate).toLocaleDateString('en-AU') : '[DATE]'}
- Building Age: ${propertyAge} years (built approx. ${currentYear - parseInt(propertyAge || '0')})
- Estimated Building Value: $${buildingValue || '[AMOUNT]'} AUD

**Current Situation:**
`;

        if (hasDepreciationSchedule === 'yes') {
            prompt += `I have a quantity surveyor's depreciation schedule with the following details:
${scheduleDetails || '[PASTE YOUR SCHEDULE DETAILS HERE]'}

Please help me:
1. **Interpret the schedule**: Explain what each line item means
2. **This Year's Claim**: What is my total depreciation claim for this financial year?
3. **Division 40 vs Division 43**: Break down the claims by category
4. **Remaining Value**: What is the remaining depreciable value?
`;
        } else if (hasDepreciationSchedule === 'no') {
            prompt += `I do NOT have a quantity surveyor's depreciation schedule.

Please advise:
1. **Is a schedule worthwhile?**: Based on the property age and value, would a depreciation schedule be worthwhile?
2. **Typical costs**: What does a quantity surveyor report typically cost?
3. **Expected deductions**: For a ${property.propertyType} of this age, what depreciation might I expect?
4. **DIY options**: Are there any depreciation claims I can make without a professional schedule?
5. **Key items**: What fixtures and fittings typically have the highest depreciation value?
`;
        } else {
            prompt += `I'm unsure whether I have a depreciation schedule or need one.

Please help me understand:
1. **What is property depreciation?**: Explain Division 40 (plant & equipment) vs Division 43 (capital works)
2. **Do I need a schedule?**: When is a quantity surveyor report worthwhile?
3. **Building age impact**: How does the construction date (${currentYear - parseInt(propertyAge || '0') || 'unknown'}) affect my claims?
4. **Typical deductions**: What depreciation might I expect for a ${property.propertyType}?
`;
        }

        prompt += `
**Important:**
- Use current ATO guidelines for rental property depreciation
- Consider the property was purchased in ${purchaseYear}
- Apply Division 40 and Division 43 rules correctly
- Note any changes from the 2017 depreciation law changes for second-hand assets`;

        return prompt;
    };

    // Copy prompt to clipboard
    const handleCopyPrompt = async () => {
        const prompt = generatePrompt();
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    return (
        <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                        <Sparkles className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">Property Depreciation Helper</h3>
                        <p className="text-sm text-text-secondary">Generate a prompt for Gemini to help with your depreciation schedule</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-4">
                {/* Property Summary */}
                <div className="p-3 rounded-lg bg-background-elevated flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-text-muted" />
                    <div>
                        <p className="text-sm font-medium text-text-primary">{property.address}</p>
                        <p className="text-xs text-text-muted">{property.suburb} {property.state} • {property.propertyType}</p>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="BUILDING AGE (YEARS)"
                        type="number"
                        placeholder="e.g. 15"
                        value={buildingAge}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuildingAge(e.target.value)}
                        leftIcon={<Calendar className="w-4 h-4 text-text-muted" />}
                        hint="Approximate age since construction"
                    />
                    <Input
                        label="ESTIMATED BUILDING VALUE (AUD)"
                        type="number"
                        placeholder="0.00"
                        value={buildingValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuildingValue(e.target.value)}
                        leftIcon={<span className="text-text-muted">$</span>}
                        hint="Exclude land value"
                    />
                </div>

                {/* Schedule Question */}
                <div>
                    <label className="block text-xs text-text-muted mb-2 uppercase">Do you have a depreciation schedule?</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setHasDepreciationSchedule('yes')}
                            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${hasDepreciationSchedule === 'yes'
                                    ? 'bg-accent/20 border-accent text-accent'
                                    : 'bg-background-elevated border-border text-text-secondary hover:border-primary'
                                }`}
                        >
                            Yes, I have one
                        </button>
                        <button
                            onClick={() => setHasDepreciationSchedule('no')}
                            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${hasDepreciationSchedule === 'no'
                                    ? 'bg-accent/20 border-accent text-accent'
                                    : 'bg-background-elevated border-border text-text-secondary hover:border-primary'
                                }`}
                        >
                            No, I don't
                        </button>
                        <button
                            onClick={() => setHasDepreciationSchedule('unknown')}
                            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${hasDepreciationSchedule === 'unknown'
                                    ? 'bg-accent/20 border-accent text-accent'
                                    : 'bg-background-elevated border-border text-text-secondary hover:border-primary'
                                }`}
                        >
                            Not sure
                        </button>
                    </div>
                </div>

                {/* Schedule Details (if they have one) */}
                {hasDepreciationSchedule === 'yes' && (
                    <div>
                        <label className="block text-xs text-text-muted mb-1.5 uppercase">Paste Your Schedule Details</label>
                        <textarea
                            value={scheduleDetails}
                            onChange={(e) => setScheduleDetails(e.target.value)}
                            placeholder="Paste the depreciation schedule details here (or key line items)..."
                            className="w-full px-4 py-3 rounded-lg bg-background-elevated border border-border text-text-primary placeholder-text-muted resize-none h-32"
                        />
                        <p className="text-xs text-text-muted mt-1">Include Division 40 and Division 43 items if available</p>
                    </div>
                )}

                {/* Generated Prompt Preview */}
                <div>
                    <label className="block text-xs text-text-muted mb-1.5 uppercase">Generated Prompt</label>
                    <div className="p-4 rounded-lg bg-background-secondary border border-border max-h-48 overflow-y-auto">
                        <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
                            {generatePrompt()}
                        </pre>
                    </div>
                </div>

                {/* Warning about AI */}
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-text-secondary">
                            AI responses are for guidance only. For accurate depreciation claims, consider getting a professional quantity surveyor report.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button onClick={handleCopyPrompt} className="flex-1">
                        {copied ? (
                            <>
                                <Check className="w-4 h-4" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Copy Prompt to Clipboard
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
