import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    Download, Upload, Trash2, AlertTriangle, Check,
    Database, Shield, Settings as SettingsIcon,
    Calculator, DollarSign, Car, Utensils, HelpCircle, Plus, Minus, Save,
    Smartphone, CheckCircle
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { exportDatabase, importDatabase, clearAllData } from '../database/db';
import { usePWA } from '../hooks/usePWA';
import type { TaxBracket, TaxSettings as TaxSettingsType } from '../types';

export function Settings() {
    const {
        currentFinancialYear,
        isInitialized,
        initialize,
        taxSettings,
        setTaxSettings
    } = useTaxFlowStore();

    const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pwa = usePWA();

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

    // Export database to JSON file
    const handleExport = async () => {
        try {
            const jsonData = await exportDatabase();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `taxflow-backup-${currentFinancialYear}-${timestamp}.json`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setExportStatus('success');
            setTimeout(() => setExportStatus('idle'), 3000);
        } catch (error) {
            console.error('Export failed:', error);
            setExportStatus('error');
            setTimeout(() => setExportStatus('idle'), 3000);
        }
    };

    // Import database from JSON file
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            await importDatabase(text);

            // Reinitialize store after import
            if (!isInitialized) {
                initialize();
            }

            setImportStatus('success');
            setTimeout(() => setImportStatus('idle'), 3000);
        } catch (error) {
            console.error('Import failed:', error);
            setImportStatus('error');
            setTimeout(() => setImportStatus('idle'), 3000);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Clear all data
    const handleClearData = async () => {
        try {
            await clearAllData();
            setShowClearConfirm(false);
            window.location.reload();
        } catch (error) {
            console.error('Clear failed:', error);
        }
    };

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
                        <SettingsIcon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
                        <p className="text-text-secondary">Manage tax settings for FY {currentFinancialYear}</p>
                    </div>
                </div>

                {/* Tax Settings Section */}
                <Card>
                    <CardHeader
                        title="Tax Settings"
                        subtitle={`Configure tax rates and thresholds for FY ${currentFinancialYear}`}
                    />

                    {/* Tax Brackets Table */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-accent" />
                                <span className="font-medium text-text-primary">Income Tax Brackets</span>
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

                    {/* Other Tax Rates */}
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
                                Save Tax Settings
                            </>
                        )}
                    </Button>
                </Card>

                {/* PWA Installation Section */}
                <Card>
                    <CardHeader
                        title="Install App"
                        subtitle="Install TaxFlow as a desktop or mobile app"
                    />

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                            <Smartphone className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-text-primary">Progressive Web App</p>
                                <p className="text-sm text-text-secondary">
                                    Install TaxFlow for quick access from your taskbar or homescreen. Works offline!
                                </p>
                            </div>
                        </div>

                        {pwa.isInstalled ? (
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
                                <CheckCircle className="w-5 h-5 text-success" />
                                <span className="font-medium text-success">App is installed!</span>
                            </div>
                        ) : pwa.isInstallable ? (
                            <Button onClick={() => pwa.promptInstall()} className="w-full">
                                <Smartphone className="w-4 h-4" />
                                Install App
                            </Button>
                        ) : (
                            <div className="text-sm text-text-secondary p-4 bg-background-elevated rounded-lg">
                                <p className="mb-2"><strong>Manual Installation:</strong></p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li><strong>Chrome/Edge:</strong> Click the install icon in the address bar</li>
                                    <li><strong>Safari (iOS):</strong> Tap Share → Add to Home Screen</li>
                                    <li><strong>Android:</strong> Tap Menu → Add to Home Screen</li>
                                </ul>
                            </div>
                        )}

                        {!pwa.isOnline && (
                            <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-warning text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                You are currently offline
                            </div>
                        )}
                    </div>
                </Card>

                {/* Data Backup Section */}
                <Card>
                    <CardHeader
                        title="Data Backup & Restore"
                        subtitle="Export your data for safekeeping or restore from a backup"
                    />

                    <div className="grid grid-cols-2 gap-6">
                        {/* Export */}
                        <div className="p-4 rounded-lg border border-border bg-background-elevated">
                            <div className="flex items-center gap-3 mb-3">
                                <Download className="w-5 h-5 text-success" />
                                <span className="font-medium text-text-primary">Export Backup</span>
                            </div>
                            <p className="text-sm text-text-secondary mb-4">
                                Download all your data as a JSON file. Store this file safely to restore later.
                            </p>
                            <Button onClick={handleExport} variant="secondary" className="w-full">
                                {exportStatus === 'success' ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Downloaded!
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Download Backup
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Import */}
                        <div className="p-4 rounded-lg border border-border bg-background-elevated">
                            <div className="flex items-center gap-3 mb-3">
                                <Upload className="w-5 h-5 text-accent" />
                                <span className="font-medium text-text-primary">Restore Backup</span>
                            </div>
                            <p className="text-sm text-text-secondary mb-4">
                                Restore your data from a previously exported backup file.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="secondary"
                                className="w-full"
                            >
                                {importStatus === 'success' ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Restored!
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Import Backup
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Data Storage Info */}
                <Card>
                    <CardHeader
                        title="Data Storage"
                        subtitle="How your data is stored and protected"
                    />

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                            <Database className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-text-primary">Local-First Storage</p>
                                <p className="text-sm text-text-secondary">
                                    All your data is stored locally in your browser using IndexedDB.
                                    Your sensitive financial information never leaves your device.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                            <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-text-primary">Privacy by Design</p>
                                <p className="text-sm text-text-secondary">
                                    No cloud sync, no accounts, no tracking. Your tax data stays private.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Danger Zone */}
                <Card>
                    <CardHeader
                        title="Danger Zone"
                        subtitle="Irreversible actions"
                    />

                    <div className="p-4 rounded-lg border border-danger/30 bg-danger/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-text-primary">Clear All Data</p>
                                <p className="text-sm text-text-secondary">
                                    Permanently delete all your data. This cannot be undone.
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => setShowClearConfirm(true)}
                                className="border-danger text-danger hover:bg-danger hover:text-white"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear Data
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Clear Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-danger/20">
                                <AlertTriangle className="w-6 h-6 text-danger" />
                            </div>
                            <h2 className="text-xl font-bold text-text-primary">Clear All Data?</h2>
                        </div>

                        <p className="text-text-secondary mb-6">
                            This will permanently delete all your tax data, receipts, property records,
                            and settings. This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleClearData}
                                className="flex-1 bg-danger hover:bg-danger/90"
                            >
                                Yes, Delete Everything
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setShowClearConfirm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

