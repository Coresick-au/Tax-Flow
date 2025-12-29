import { useState } from 'react';
import { X, User } from 'lucide-react';
import { useTaxFlowStore } from '../../stores/taxFlowStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface CreateProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateProfileModal({ isOpen, onClose }: CreateProfileModalProps) {
    const { createProfile } = useTaxFlowStore();
    const [name, setName] = useState('');
    const [occupation, setOccupation] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            await createProfile(name.trim(), occupation.trim() || 'Not specified');
            onClose();
        } catch (error) {
            console.error('Failed to create profile:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">Create Profile</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-background-elevated"
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <Input
                        label="NAME"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                        autoFocus
                    />

                    <Input
                        label="OCCUPATION (OPTIONAL)"
                        value={occupation}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOccupation(e.target.value)}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <Button onClick={handleCreate} disabled={!name.trim() || isCreating} className="flex-1">
                        {isCreating ? 'Creating...' : 'Create Profile'}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
