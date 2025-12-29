import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Wallet,
    Receipt,
    FileText,
    Settings,
    Plus,
    ChevronDown,
    Building2,
    Coins,
    Camera,
    Pencil,
    DollarSign,
} from 'lucide-react';
import { useTaxFlowStore } from '../../stores/taxFlowStore';
import { Button } from '../ui';
import { ProfileSwitcher } from '../profile/ProfileSwitcher';

interface SidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'income', label: 'Income', icon: Wallet, path: '/income' },
    { id: 'deductions', label: 'Deductions', icon: Receipt, path: '/deductions' },
    { id: 'property', label: 'Property Portfolio', icon: Building2, path: '/property' },
    { id: 'crypto', label: 'Crypto & CGT', icon: Coins, path: '/crypto' },
    { id: 'receipts', label: 'Receipts', icon: FileText, path: '/receipts' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
    { id: 'ato-settings', label: 'ATO Settings', icon: Settings, path: '/settings' },
];

export function Sidebar({ isCollapsed = false }: SidebarProps) {
    const navigate = useNavigate();
    const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        currentFinancialYear,
        availableFinancialYears,
        setFinancialYear,
    } = useTaxFlowStore();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsNewEntryOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const newEntryOptions = [
        {
            id: 'receipt',
            label: 'New Receipt',
            icon: Camera,
            description: 'Upload receipt photo',
            action: () => {
                setIsNewEntryOpen(false);
                navigate('/receipts');
            }
        },
        {
            id: 'deduction',
            label: 'New Deduction',
            icon: Pencil,
            description: 'Log work expense',
            action: () => {
                setIsNewEntryOpen(false);
                navigate('/deductions');
            }
        },
        {
            id: 'income',
            label: 'New Income',
            icon: DollarSign,
            description: 'Record income entry',
            action: () => {
                setIsNewEntryOpen(false);
                navigate('/income');
            }
        },
    ];

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-background-secondary border-r border-border-muted flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'
                }`}
        >
            {/* Logo and FY Selector */}
            <div className="p-4 border-b border-border-muted">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-text-inverse" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h1 className="font-bold text-text-primary">TaxFlow AU</h1>
                            <div className="relative">
                                <select
                                    value={currentFinancialYear}
                                    onChange={(e) => setFinancialYear(e.target.value)}
                                    className="text-xs text-text-secondary bg-transparent border-none cursor-pointer hover:text-primary focus:outline-none appearance-none pr-4"
                                >
                                    {availableFinancialYears.map((fy) => (
                                        <option key={fy} value={fy} className="bg-background-secondary">
                                            FY {fy}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1 px-2">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${isActive
                                        ? 'bg-accent/20 text-accent border-l-2 border-accent'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* New Entry Button with Dropdown */}
            <div className="p-4 relative" ref={dropdownRef}>
                <Button
                    variant="primary"
                    className={`w-full ${isCollapsed ? 'px-0 justify-center' : ''}`}
                    onClick={() => setIsNewEntryOpen(!isNewEntryOpen)}
                >
                    <Plus className="w-5 h-5" />
                    {!isCollapsed && <span>New Entry</span>}
                </Button>

                {/* Dropdown Menu */}
                {isNewEntryOpen && !isCollapsed && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 bg-background-secondary border border-border-muted rounded-lg shadow-xl overflow-hidden z-50">
                        {newEntryOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={option.action}
                                className="w-full flex items-center gap-3 p-3 hover:bg-background-elevated transition-colors text-left"
                            >
                                <div className="p-2 rounded-lg bg-accent/20">
                                    <option.icon className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-text-primary">{option.label}</p>
                                    <p className="text-xs text-text-muted">{option.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* User Profile Switcher */}
            <div className="p-4 border-t border-border-muted">
                <ProfileSwitcher />
            </div>
        </aside>
    );
}
