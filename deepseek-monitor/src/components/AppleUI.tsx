import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// --- GlassCard ---
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
  animate?: boolean;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  hoverEffect = true,
  animate = true,
  delay = 0,
  className = '',
  ...props
}) => {
  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border-') || className.includes('border ');

  const defaultBg = hasBg ? '' : 'bg-white/55';
  const defaultBorder = hasBorder ? '' : 'border border-white/65';

  const defaultHover = hoverEffect 
    ? `hover:shadow-2xl hover:translate-y-[-2px] ${hasBg ? '' : 'hover:bg-white/70'} ${hasBorder ? '' : 'hover:border-white/80'}`
    : '';

  const cardContent = (
    <div
      className={`${defaultBg} ${defaultBorder} shadow-xl shadow-slate-200/40 backdrop-blur-2xl rounded-[2rem] p-6 transition-all duration-300 ${defaultHover} ${className}`}
      {...props}
    >
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
};

// --- StatusPill ---
interface StatusPillProps {
  available: boolean;
  text?: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ available, text, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur transition-all duration-300 ${
        available
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
          : 'border-rose-500/20 bg-rose-500/10 text-rose-600'
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
      {text || (available ? 'API 可用' : '未连接/失效')}
    </div>
  );
};

// --- MetricCard ---
interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'success' | 'warning' | 'error';
  delay?: number;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
  delay = 0,
  onClick,
}) => {
  const toneColors = {
    default: 'bg-blue-500/10 text-blue-600 border border-blue-500/15',
    success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/15',
    warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/15',
    error: 'bg-rose-500/10 text-rose-600 border border-rose-500/15',
  };

  return (
    <GlassCard hoverEffect={true} delay={delay} onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
      <div className="flex items-center justify-between mb-4">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${toneColors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">{label}</p>
      <p className="mt-1.5 text-2xl font-black tracking-tight text-slate-800">{value}</p>
      {sub && <p className="mt-1 text-[11px] font-semibold text-slate-400">{sub}</p>}
    </GlassCard>
  );
};

// --- EmptyState ---
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white/40 border border-white/50 rounded-[2rem] backdrop-blur-md shadow-sm">
      <div className="grid h-14 w-14 place-items-center rounded-[1.25rem] bg-slate-500/10 text-slate-400 mb-4 shadow-inner border border-slate-500/5">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-700 tracking-tight">{title}</h3>
      <p className="mt-2 text-xs text-slate-400 max-w-xs leading-relaxed font-medium">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

// --- PageHeader ---
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  return (
    <div className="flex items-center justify-between pb-5 border-b border-slate-200/50 mb-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-400 font-semibold">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
};

// --- SectionTitle ---
interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs font-semibold text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
};
