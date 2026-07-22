import { Sparkles } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import type { CSSProperties } from 'react';

import styles from './ChatInput.module.scss';
import {
	CONTEXT_CATEGORY_ICONS,
	ContextCategory,
	getContextPickerEmptyContent,
} from './contextPicker';

// Per-category accent, mapped to semantic accent tokens (robin is the brand
// primary). Exposed to the SCSS as the `--empty-accent` custom property so the
// icon and CTA share one colour per category.
const CATEGORY_ACCENT: Record<ContextCategory, string> = {
	Dashboards: 'var(--accent-primary)',
	Alerts: 'var(--accent-cherry)',
	Services: 'var(--accent-forest)',
};

interface ContextPickerEmptyStateProps {
	category: ContextCategory;
	/** The active search query (mention or in-popover search), original case. */
	query: string;
	/** Drops the starter prompt into the composer (never auto-sends). */
	onPrefill: (prompt: string) => void;
}

/**
 * Empty state for the @-mention context picker. Distinguishes a brand-new user
 * with nothing to pick (onboarding) from a search that matched nothing, and in
 * both cases offers a clickable CTA that seeds the composer.
 */
export default function ContextPickerEmptyState({
	category,
	query,
	onPrefill,
}: ContextPickerEmptyStateProps): JSX.Element {
	const { title, ctaLabel, prefill } = getContextPickerEmptyContent(
		category,
		query,
	);
	const CategoryIcon = CONTEXT_CATEGORY_ICONS[category];

	return (
		<div
			className={styles.contextPopoverEmpty}
			style={{ '--empty-accent': CATEGORY_ACCENT[category] } as CSSProperties}
		>
			<span className={styles.contextPopoverEmptyIcon} aria-hidden="true">
				<CategoryIcon size={16} />
			</span>
			<p className={styles.contextPopoverEmptyTitle}>{title}</p>
			<Button
				type="button"
				variant="link"
				size="sm"
				color="primary"
				className={styles.contextPopoverEmptyCta}
				onClick={(): void => onPrefill(prefill)}
				data-testid={`ai-context-empty-cta-${category}`}
				prefix={<Sparkles size={14} />}
			>
				<span className={styles.contextPopoverEmptyCtaLabel}>{ctaLabel}</span>
			</Button>
		</div>
	);
}
