import { useState } from 'react';
import { User, ChevronDown, Plus, Check } from 'lucide-react';
import { useTaxFlowStore } from '../../stores/taxFlowStore';
import { CreateProfileModal } from './CreateProfileModal';

export function ProfileSwitcher() {
    const {
        userProfile,
        availableProfiles,
        currentProfileId,
        setCurrentProfile,
        loadProfiles,
    } = useTaxFlowStore();

    const [isOpen, setIsOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleToggle = async () => {
        if (!isOpen) {
            await loadProfiles();
        }
        setIsOpen(!isOpen);
    };

    const handleSelectProfile = async (profileId: string) => {
        await setCurrentProfile(profileId);
        setIsOpen(false);
    };

    const displayName = userProfile?.name || 'Select Profile';
    const displayOccupation = userProfile?.occupation || 'No profile selected';

    return (
        <div className="relative">
            {/* Current profile display */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background-elevated transition-colors"
            >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                    <p className="font-medium text-text-primary text-sm">{displayName}</p>
                    <p className="text-xs text-text-muted">{displayOccupation}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-background-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                    <div className="p-2">
                        <p className="text-xs text-text-muted px-2 py-1 uppercase tracking-wider">Switch Profile</p>

                        {availableProfiles.length === 0 ? (
                            <p className="text-sm text-text-secondary px-2 py-2">No profiles yet</p>
                        ) : (
                            availableProfiles.map((profile) => (
                                <button
                                    key={profile.profileId}
                                    onClick={() => handleSelectProfile(profile.profileId)}
                                    className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-background-elevated transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                                        <span className="text-sm font-medium text-accent">
                                            {profile.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm text-text-primary">{profile.name}</p>
                                        <p className="text-xs text-text-muted">{profile.occupation}</p>
                                    </div>
                                    {currentProfileId === profile.profileId && (
                                        <Check className="w-4 h-4 text-success" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="border-t border-border p-2">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowCreateModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-background-elevated transition-colors text-primary"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-medium">Add New Profile</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Create profile modal */}
            {showCreateModal && (
                <CreateProfileModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
}
