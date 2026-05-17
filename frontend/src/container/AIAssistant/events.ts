/**
 * Analytics event names for the AI Assistant feature.
 *
 * Call sites use `logEvent` directly:
 *   logEvent(AIAssistantEvents.MessageSent, { ... })
 *
 * Backend-emitted events (Execution finished, Approval resolved, Resource
 * mutated, Clarification requested, Limit hit) are not declared here — they
 * fire from the AI service, not the frontend.
 */

/**
 * Shape of the router state attached by drawer/modal `handleExpand` when
 * navigating to the full-screen page. `AIAssistantPage` reads it from
 * `useLocation().state` and suppresses its mount-time `Opened` fire when
 * `fromInApp === true` — the open already counted on the prior surface.
 *
 * Lives here (next to the events) so any future expand entry point can
 * import the same shape and stay consistent. Router state — not a module
 * flag — because flags are not StrictMode-safe (consumed on first mount,
 * gone for the second) and survive aborted navigations.
 */
export interface AIAssistantRouteState {
	fromInApp?: boolean;
}

/**
 * Browser identification useful for filtering analytics — especially voice
 * input, where Chromium derivatives (Helium, Brave, Vivaldi, …) ship without
 * the Google Speech API key and always fail with `network`. Returns the
 * detected name + version, a platform string, and the raw user-agent for
 * fallback grouping. Lives in events.ts (not a separate util) because it's
 * scoped to analytics enrichment.
 */
export interface BrowserInfo {
	browserName: string;
	browserVersion: string;
	platform: string;
	userAgent: string;
}

interface UABrand {
	brand: string;
	version: string;
}

/**
 * Branded subset of `Navigator` that exposes the (still partly experimental)
 * `userAgentData` surface plus Brave's `isBrave()` probe. Both are Chromium-
 * only, both are optional at runtime, and TS lib types don't declare them.
 */
type NavigatorWithBrandHints = Navigator & {
	userAgentData?: { brands: UABrand[] };
	brave?: { isBrave: () => Promise<boolean> };
};

/**
 * Priority order for picking a brand out of `userAgentData.brands`. Listed
 * derivative-first so a Chromium fork that advertises both its own brand
 * AND "Chromium" / "Google Chrome" resolves to the derivative — which is
 * exactly the signal we need to triage `Voice input failed` (derivatives
 * lack the Google Speech API key). Matching is case-insensitive and
 * substring-based to tolerate "Microsoft Edge", "Brave Browser", etc.
 */
const BRAND_PRIORITY = [
	'Edge',
	'Opera',
	'Brave',
	'Vivaldi',
	'Helium',
	'Arc',
	'Yandex',
	'Samsung',
	'Google Chrome',
	'Chrome',
	'Chromium',
] as const;

function pickBrand(brands: UABrand[]): UABrand | null {
	const real = brands.filter((b) => !/not.*brand/i.test(b.brand));
	for (const target of BRAND_PRIORITY) {
		const hit = real.find((b) =>
			b.brand.toLowerCase().includes(target.toLowerCase()),
		);
		if (hit) {
			return hit;
		}
	}
	// Fall back to the first non-decoy entry — better than silently
	// reporting 'unknown' when the browser surfaces a brand we haven't
	// catalogued yet.
	return real[0] ?? null;
}

export function getBrowserInfo(): BrowserInfo {
	if (typeof navigator === 'undefined') {
		return {
			browserName: 'unknown',
			browserVersion: 'unknown',
			platform: 'unknown',
			userAgent: 'unknown',
		};
	}
	const nav = navigator as NavigatorWithBrandHints;
	const ua = nav.userAgent;
	let browserName = 'unknown';
	let browserVersion = 'unknown';

	// Prefer `userAgentData.brands` — structured, less spoofable than UA
	// sniffing — but only trust it when it produces a *specific* identity.
	// Generic "Chromium" / "Google Chrome" matches are kept as a soft hit
	// and overridden if UA sniffing finds a derivative (Edg/, OPR/, …).
	const brands = nav.userAgentData?.brands;
	let isGenericBrand = false;
	if (brands?.length) {
		const picked = pickBrand(brands);
		if (picked) {
			browserName = picked.brand;
			browserVersion = picked.version;
			isGenericBrand = /^(google\s+)?chrom(e|ium)$/i.test(picked.brand);
		}
	}

	// UA sniffing — runs when brands didn't resolve, or when it resolved to
	// a generic Chrome/Chromium entry that a derivative might be hiding
	// behind. Order matters: Edge / Opera include "Chrome" in their UA;
	// Chrome includes "Safari".
	if (browserName === 'unknown' || isGenericBrand) {
		const matchers: { name: string; re: RegExp }[] = [
			{ name: 'Edge', re: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
			{ name: 'Opera', re: /OPR\/([\d.]+)/ },
			{ name: 'Vivaldi', re: /Vivaldi\/([\d.]+)/ },
			{ name: 'Yandex', re: /YaBrowser\/([\d.]+)/ },
			{ name: 'Samsung', re: /SamsungBrowser\/([\d.]+)/ },
			{ name: 'Chrome', re: /Chrome\/([\d.]+)/ },
			{ name: 'Firefox', re: /Firefox\/([\d.]+)/ },
			{ name: 'Safari', re: /Version\/([\d.]+).*Safari/ },
		];
		for (const { name, re } of matchers) {
			const m = ua.match(re);
			if (m) {
				browserName = name;
				browserVersion = m[1];
				break;
			}
		}
	}

	// Brave is invisible in both `userAgentData.brands` (advertises Chrome)
	// and the UA string (identical to Chrome) — it only declares itself via
	// `navigator.brave?.isBrave()`. The check is async, so we can't await
	// it here; instead surface the probe's *presence* as a strong signal.
	// Same browser surface every time, so caching the read is fine.
	if (nav.brave?.isBrave) {
		browserName = 'Brave';
	}

	return {
		browserName,
		browserVersion,
		platform: nav.platform || 'unknown',
		userAgent: ua,
	};
}

export enum AIAssistantEvents {
	Opened = 'AI Assistant: Opened',
	MessageSent = 'AI Assistant: Message sent',
	SuggestedPromptClicked = 'AI Assistant: Suggested prompt clicked',
	CancelClicked = 'AI Assistant: Cancel clicked',
	RegenerateClicked = 'AI Assistant: Regenerate clicked',
	MessageCopied = 'AI Assistant: Message copied',
	FeedbackSubmitted = 'AI Assistant: Feedback submitted',
	ResourceOpened = 'AI Assistant: Resource opened',
	DocOpened = 'AI Assistant: Doc opened',
	ApplyFilterClicked = 'AI Assistant: Apply filter clicked',
	ThreadOpenedFromHistory = 'AI Assistant: Thread opened from history',
	VoiceInputUsed = 'AI Assistant: Voice input used',
	VoiceInputFailed = 'AI Assistant: Voice input failed',
	NewChatClicked = 'AI Assistant: New chat clicked',
}
