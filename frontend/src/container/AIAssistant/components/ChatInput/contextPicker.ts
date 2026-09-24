import { Bell, LayoutDashboard, ShieldCheck } from '@signozhq/icons';

/** Ordered category tabs shown in the @-mention context picker. */
export const CONTEXT_CATEGORIES = ['Dashboards', 'Alerts', 'Services'] as const;

export type ContextCategory = (typeof CONTEXT_CATEGORIES)[number];

/**
 * Icon per category, shared by the picker tablist and the empty state. `satisfies`
 * keeps the concrete component types so callers can render `<Icon size={n} />`.
 */
export const CONTEXT_CATEGORY_ICONS = {
	Dashboards: LayoutDashboard,
	Alerts: Bell,
	Services: ShieldCheck,
} satisfies Record<ContextCategory, unknown>;

/**
 * Resolved copy + composer prefill for one render of the context picker's empty
 * state. The picker is tabbed, so a user only ever views one category at a
 * time — each category gets its own onboarding and search-miss copy rather than
 * a single combined "nothing to show" line.
 */
export interface ContextPickerEmptyContent {
	/** Primary line explaining why the list is empty. */
	title: string;
	/** Clickable call to action that prefills (never auto-sends) the composer. */
	ctaLabel: string;
	/**
	 * Text dropped into the composer when the CTA is clicked. When there's no
	 * search query this is just the prefix with a trailing space, leaving the
	 * caret at the end for the user to type the entity name.
	 */
	prefill: string;
}

interface CategoryCopy {
	/** Onboarding line, e.g. "No dashboards yet." */
	emptyTitle: string;
	/** Onboarding CTA label, e.g. "Ask me to create one". */
	emptyCtaLabel: string;
	/** Search-miss line, e.g. `No dashboards match "checkout".` */
	matchTitle: (query: string) => string;
	/** Search-miss CTA label, e.g. `Create a dashboard for "checkout"`. */
	matchCtaLabel: (query: string) => string;
	/**
	 * Composer prefill prefix (with trailing space). The prefill is always
	 * `${prefillPrefix}${query}`, so the search-miss case seeds the query and
	 * the onboarding case leaves only the prefix.
	 */
	prefillPrefix: string;
}

// Services get instrumentation-flavoured copy: the assistant can't "create" a
// service, they come from telemetry, so the CTA points at setup instead.
const CONTEXT_PICKER_COPY: Record<ContextCategory, CategoryCopy> = {
	Dashboards: {
		emptyTitle: 'No dashboards yet.',
		emptyCtaLabel: 'Ask me to create one',
		matchTitle: (query) => `No dashboards match "${query}".`,
		matchCtaLabel: (query) => `Create a dashboard for "${query}"`,
		prefillPrefix: 'Create a dashboard for ',
	},
	Alerts: {
		emptyTitle: 'No alerts yet.',
		emptyCtaLabel: 'Ask me to create one',
		matchTitle: (query) => `No alerts match "${query}".`,
		matchCtaLabel: (query) => `Create an alert for "${query}"`,
		prefillPrefix: 'Create an alert for ',
	},
	Services: {
		emptyTitle: 'No services reporting data yet.',
		emptyCtaLabel: 'Ask me to help set up instrumentation',
		matchTitle: (query) => `No services match "${query}".`,
		matchCtaLabel: (query) => `Set up instrumentation for "${query}"`,
		prefillPrefix: 'Help me set up instrumentation for ',
	},
};

/**
 * Build the empty-state copy for a category. The two states are driven solely
 * by whether a search query is active: a non-empty query yields the search-miss
 * variant, an empty query the onboarding variant.
 */
export function getContextPickerEmptyContent(
	category: ContextCategory,
	query: string,
): ContextPickerEmptyContent {
	const copy = CONTEXT_PICKER_COPY[category];
	const trimmed = query.trim();
	if (trimmed) {
		return {
			title: copy.matchTitle(trimmed),
			ctaLabel: copy.matchCtaLabel(trimmed),
			prefill: `${copy.prefillPrefix}${trimmed}`,
		};
	}
	return {
		title: copy.emptyTitle,
		ctaLabel: copy.emptyCtaLabel,
		prefill: copy.prefillPrefix,
	};
}
