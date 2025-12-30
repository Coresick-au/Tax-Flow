import { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
}

export function Card({ children, className = '', padding = 'md', hoverable = false, ...props }: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    const hoverStyles = hoverable
        ? 'hover:bg-background-elevated hover:border-border cursor-pointer transition-colors duration-200'
        : '';

    return (
        <div
            className={`bg-background-card border border-border-muted rounded-xl shadow-card ${paddingStyles[padding]} ${hoverStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div>
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
