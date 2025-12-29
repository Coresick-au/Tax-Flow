import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    trend?: {
        value: number;
        label?: string;
    };
    icon?: ReactNode;
    iconBgColor?: string;
}

export function StatCard({ title, value, subtitle, trend, icon, iconBgColor = 'bg-primary-muted' }: StatCardProps) {
    const getTrendIcon = () => {
        if (!trend) return null;

        if (trend.value > 0) {
            return <TrendingUp className="w-4 h-4 text-success" />;
        } else if (trend.value < 0) {
            return <TrendingDown className="w-4 h-4 text-danger" />;
        }
        return <Minus className="w-4 h-4 text-text-muted" />;
    };

    const getTrendColor = () => {
        if (!trend) return '';
        if (trend.value > 0) return 'text-success';
        if (trend.value < 0) return 'text-danger';
        return 'text-text-muted';
    };

    return (
        <Card>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-text-secondary font-medium">{title}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-text-primary">{value}</span>
                        {trend && (
                            <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                                {getTrendIcon()}
                                <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                            </div>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-text-muted mt-1">{subtitle}</p>
                    )}
                </div>
                {icon && (
                    <div className={`p-2 rounded-lg ${iconBgColor}`}>
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    );
}
