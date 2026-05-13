import type { BadgeColor } from '@signozhq/ui/badge';

export const STATE_ORDER = ['firing', 'pending', 'inactive', 'disabled'];
export const SEVERITY_ORDER = ['critical', 'error', 'warning', 'info'];

export const STATE_LABELS: Record<string, string> = {
	firing: 'Firing',
	pending: 'Pending',
	inactive: 'OK',
	disabled: 'Disabled',
};

export const STATE_COLORS: Record<string, string> = {
	firing: 'var(--bg-cherry-500)',
	pending: 'var(--bg-amber-500)',
	inactive: 'var(--bg-forest-500)',
	disabled: 'var(--l2-foreground)',
};

export const SEVERITY_COLORS: Record<string, string> = {
	critical: 'var(--bg-cherry-500)',
	error: 'var(--bg-cherry-400)',
	warning: 'var(--bg-amber-500)',
	info: 'var(--bg-robin-500)',
};

export const SEVERITY_BADGE_COLORS: Record<string, BadgeColor> = {
	critical: 'error',
	error: 'error',
	warning: 'warning',
	info: 'primary',
};
