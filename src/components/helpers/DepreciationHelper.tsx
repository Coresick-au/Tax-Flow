import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sparkles, Copy, Check, Calculator, Calendar, AlertCircle } from 'lucide-react';

interface DepreciationHelperProps {
    onClose?: () => void;
}

export function DepreciationHelper({ onClose }: DepreciationHelperProps) {
    const [itemName, setItemName] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [workUsePercent, setWorkUsePercent] = useState('100');
    const [copied, setCopied] = useState(false);

    // Generate the AI prompt for Gemini
    const generatePrompt = () => {
        const currentYear = new Date().getFullYear();
        const fyStart = new Date().getMonth() >= 6 ? currentYear : currentYear - 1;

        return `I need help calculating depreciation for an Australian tax return (FY ${fyStart}-${fyStart + 1}).

**Asset Details:**
- Item: ${itemName || '[ITEM NAME]'}
- Purchase Price: $${purchasePrice || '[AMOUNT]'} AUD
- Purchase Date: ${purchaseDate || '[DATE]'}
- Work-use Percentage: ${workUsePercent}%

Please provide:
1. **Effective Life**: What is the ATO-approved effective life for this type of asset?
2. **Depreciation Methods**: Calculate depreciation using both Prime Cost and Diminishing Value methods.
3. **Recommended Method**: Which method would maximize my deduction?
4. **This Year's Claim**: How much can I claim for this financial year?
5. **Future Years**: Provide a depreciation schedule for the remaining life of the asset.

Important:
- Apply the ${workUsePercent}% work-use percentage to all calculations
- Consider the instant asset write-off threshold if applicable
- Use current ATO guidelines and TR 2020/3
- Show formulas used for calculations`;
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
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/20">
                    <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-text-primary">AI Depreciation Helper</h3>
                    <p className="text-sm text-text-secondary">Generate a prompt for Gemini to calculate your depreciation</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Info Banner */}
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-text-primary">
                            Fill in your asset details and copy the generated prompt to Gemini for accurate depreciation calculations.
                        </p>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="ITEM NAME"
                        placeholder="e.g. MacBook Pro 16-inch"
                        value={itemName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemName(e.target.value)}
                        leftIcon={<Calculator className="w-4 h-4 text-text-muted" />}
                    />
                    <Input
                        label="PURCHASE PRICE (AUD)"
                        type="number"
                        placeholder="0.00"
                        value={purchasePrice}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchasePrice(e.target.value)}
                        leftIcon={<span className="text-text-muted">$</span>}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="PURCHASE DATE"
                        type="date"
                        value={purchaseDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchaseDate(e.target.value)}
                        leftIcon={<Calendar className="w-4 h-4 text-text-muted" />}
                    />
                    <Input
                        label="WORK-USE PERCENTAGE"
                        type="number"
                        placeholder="100"
                        value={workUsePercent}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkUsePercent(e.target.value)}
                        rightIcon={<span className="text-text-muted">%</span>}
                        hint="Percentage used for work purposes"
                    />
                </div>

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
                            AI responses are for guidance only. Always verify calculations with the ATO depreciation tool or a registered tax agent.
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
                    {onClose && (
                        <Button variant="secondary" onClick={onClose}>
                            Close
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
