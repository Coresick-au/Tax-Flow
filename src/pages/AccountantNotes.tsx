import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Edit3,
    Check,
    StickyNote,
    AlertTriangle,
} from 'lucide-react';
import { useTaxFlowStore } from '../stores/taxFlowStore';
import { DashboardLayout } from '../components/layout';
import { Card, CardHeader, Button, Input } from '../components/ui';
import { db } from '../database/db';
import type { AccountantNote } from '../types';

export function AccountantNotes() {
    const { currentFinancialYear, isInitialized, initialize } = useTaxFlowStore();
    const [notes, setNotes] = useState<AccountantNote[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
    });

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [initialize, isInitialized]);

    // Load notes
    const loadNotes = async () => {
        const allNotes = await db.accountantNotes
            .where('financialYear')
            .equals(currentFinancialYear)
            .toArray();

        // Sort by priority (high first) then by date (newest first)
        allNotes.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setNotes(allNotes);
    };

    useEffect(() => {
        if (currentFinancialYear) {
            loadNotes();
        }
    }, [currentFinancialYear]);

    // Add note
    const handleAddNote = async () => {
        if (!formData.title.trim()) return;

        const newNote: AccountantNote = {
            financialYear: currentFinancialYear,
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
            isResolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.accountantNotes.add(newNote);
        await loadNotes();
        setFormData({ title: '', content: '', priority: 'medium' });
        setShowAddForm(false);
    };

    // Update note
    const handleUpdateNote = async (id: number) => {
        await db.accountantNotes.update(id, {
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
            updatedAt: new Date(),
        });
        await loadNotes();
        setEditingId(null);
        setFormData({ title: '', content: '', priority: 'medium' });
    };

    // Toggle resolved
    const handleToggleResolved = async (note: AccountantNote) => {
        if (!note.id) return;
        await db.accountantNotes.update(note.id, {
            isResolved: !note.isResolved,
            updatedAt: new Date(),
        });
        await loadNotes();
    };

    // Delete note
    const handleDeleteNote = async (id: number) => {
        await db.accountantNotes.delete(id);
        await loadNotes();
    };

    // Start editing
    const startEdit = (note: AccountantNote) => {
        setEditingId(note.id || null);
        setFormData({
            title: note.title,
            content: note.content,
            priority: note.priority,
        });
    };

    // Filter notes
    const filteredNotes = notes.filter(note => {
        if (filter === 'active') return !note.isResolved;
        if (filter === 'resolved') return note.isResolved;
        return true;
    });

    const priorityColors = {
        high: 'bg-danger/20 text-danger border-danger/30',
        medium: 'bg-warning/20 text-warning border-warning/30',
        low: 'bg-info/20 text-info border-info/30',
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/20">
                            <StickyNote className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">Accountant Notes</h1>
                            <p className="text-text-secondary">Things to remember for tax time</p>
                        </div>
                    </div>
                    <Button onClick={() => setShowAddForm(true)}>
                        <Plus className="w-4 h-4" />
                        Add Note
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {(['active', 'resolved', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-accent text-white'
                                : 'bg-background-elevated text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            {f === 'active' && (
                                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                                    {notes.filter(n => !n.isResolved).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Add/Edit Form */}
                {(showAddForm || editingId) && (
                    <Card>
                        <CardHeader
                            title={editingId ? 'Edit Note' : 'New Note'}
                            subtitle="Add something you need to discuss with your accountant"
                        />
                        <div className="space-y-4">
                            <Input
                                label="TITLE"
                                placeholder="e.g., Ask about home office deductions"
                                value={formData.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData(prev => ({ ...prev, title: e.target.value }))
                                }
                            />
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    DETAILS
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 rounded-lg bg-background-elevated border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                                    placeholder="Additional details or context..."
                                    value={formData.content}
                                    onChange={(e) =>
                                        setFormData(prev => ({ ...prev, content: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    PRIORITY
                                </label>
                                <div className="flex gap-2">
                                    {(['low', 'medium', 'high'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${formData.priority === p
                                                ? priorityColors[p]
                                                : 'bg-background-elevated text-text-secondary border-border hover:border-text-muted'
                                                }`}
                                        >
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={() => editingId ? handleUpdateNote(editingId) : handleAddNote()}
                                >
                                    {editingId ? 'Update Note' : 'Add Note'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingId(null);
                                        setFormData({ title: '', content: '', priority: 'medium' });
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Notes List */}
                {filteredNotes.length === 0 ? (
                    <Card>
                        <div className="text-center py-12">
                            <StickyNote className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <p className="text-text-secondary mb-2">
                                {filter === 'resolved'
                                    ? 'No resolved notes yet'
                                    : 'No notes yet'
                                }
                            </p>
                            <p className="text-text-muted text-sm">
                                Add notes for things you need to discuss with your accountant
                            </p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className={`p-4 rounded-lg border transition-colors ${note.isResolved
                                    ? 'bg-background-elevated/50 border-border opacity-70'
                                    : 'bg-background-card border-border hover:border-accent/50'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => handleToggleResolved(note)}
                                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${note.isResolved
                                            ? 'bg-success border-success text-white'
                                            : 'border-border hover:border-success'
                                            }`}
                                    >
                                        {note.isResolved && <Check className="w-3 h-3" />}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`font-medium ${note.isResolved ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                                {note.title}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${priorityColors[note.priority]}`}>
                                                {note.priority}
                                            </span>
                                        </div>
                                        {note.content && (
                                            <p className={`text-sm ${note.isResolved ? 'text-text-muted' : 'text-text-secondary'}`}>
                                                {note.content}
                                            </p>
                                        )}
                                        <p className="text-xs text-text-muted mt-2">
                                            Added {new Date(note.createdAt).toLocaleDateString('en-AU', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => startEdit(note)}
                                            className="p-2 text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => note.id && handleDeleteNote(note.id)}
                                            className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick Tips */}
                <Card>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-info/10 border border-info/30">
                        <AlertTriangle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-text-primary">Pro Tip</p>
                            <p className="text-sm text-text-secondary">
                                Use this to note unusual transactions, questions about deductibility,
                                or anything that might need explanation during your tax return meeting.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
