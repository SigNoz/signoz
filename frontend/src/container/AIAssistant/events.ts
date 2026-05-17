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
 * Set by drawer/modal `handleExpand` before navigating to the full-screen
 * page so the subsequent `AIAssistantPage` mount knows the user *expanded*
 * the already-open assistant rather than landing fresh via URL/SideNav.
 * `AIAssistantPage` consumes (reads + clears) this flag and skips firing
 * `Sidepane opened` when it's true. Module-level state is intentional —
 * the value is transient (lifetime: one mount) and not part of the store.
 */
let didExpandFromInApp = false;

export function markExpandFromInApp(): void {
	didExpandFromInApp = true;
}

export function consumeExpandFromInApp(): boolean {
	const v = didExpandFromInApp;
	didExpandFromInApp = false;
	return v;
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

export function getBrowserInfo(): BrowserInfo {
	if (typeof navigator === 'undefined') {
		return {
			browserName: 'unknown',
			browserVersion: 'unknown',
			platform: 'unknown',
			userAgent: 'unknown',
		};
	}
	const ua = navigator.userAgent;
	// Prefer the modern, structured userAgentData when present — it
	// distinguishes Chrome / Chromium / Edge cleanly without UA parsing
	// gymnastics. Fall back to UA sniffing on Safari/Firefox.
	const brands = (
		navigator as Navigator & {
			userAgentData?: { brands: { brand: string; version: string }[] };
		}
	).userAgentData?.brands;
	let browserName = 'unknown';
	let browserVersion = 'unknown';
	if (brands?.length) {
		// Skip the spec-mandated "Not/A)Brand" decoy entry that browsers
		// include to discourage UA-based feature detection.
		const real = brands.find((b) => !/not.*brand/i.test(b.brand));
		if (real) {
			browserName = real.brand;
			browserVersion = real.version;
		}
	}
	if (browserName === 'unknown') {
		// Order matters: Edge has "Chrome" in its UA, Chrome has "Safari".
		const matchers: { name: string; re: RegExp }[] = [
			{ name: 'Edge', re: /Edg\/([\d.]+)/ },
			{ name: 'Opera', re: /OPR\/([\d.]+)/ },
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
	return {
		browserName,
		browserVersion,
		platform: navigator.platform || 'unknown',
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
