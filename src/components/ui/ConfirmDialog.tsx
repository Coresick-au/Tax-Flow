import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-danger/20',
            iconColor: 'text-danger',
            confirmBtn: 'bg-danger hover:bg-danger/90',
        },
        warning: {
            icon: 'bg-warning/20',
            iconColor: 'text-warning',
            confirmBtn: 'bg-warning hover:bg-warning/90',
        },
        info: {
            icon: 'bg-accent/20',
            iconColor: 'text-accent',
            confirmBtn: '',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-full ${styles.icon}`}>
                        <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                </div>

                <p className="text-text-secondary mb-6">{message}</p>

                <div className="flex gap-3">
                    <Button
                        onClick={onConfirm}
                        className={`flex-1 ${styles.confirmBtn}`}
                    >
                        {confirmText}
                    </Button>
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
