/**
 * Analytics event names for the AI Assistant feature. Backend-emitted events
 * (Execution finished, Approval resolved, Resource mutated, Clarification
 * requested, Limit hit) are not declared here — they fire from the AI service.
 */

export interface BrowserInfo {
	browserName: string;
	browserVersion: string;
}

type NavigatorWithBrandHints = Navigator & {
	userAgentData?: { brands: { brand: string; version: string }[] };
	brave?: { isBrave: () => Promise<boolean> };
};

/**
 * We mainly need to distinguish Chrome / Edge (Speech API works) from Chromium
 * derivatives (no Google API key → voice fails with `network`). UA sniffing is
 * the source of truth for derivative identification; `userAgentData` is used
 * only as a fast happy path for Chrome / Edge. Brave needs its own probe — it
 * advertises Chrome in both UA and brand hints.
 */
export function getBrowserInfo(): BrowserInfo {
	if (typeof navigator === 'undefined') {
		return { browserName: 'unknown', browserVersion: 'unknown' };
	}
	const nav = navigator as NavigatorWithBrandHints;
	const ua = nav.userAgent;

	// Order matters: derivatives put "Chrome" in their UA; Chrome puts "Safari".
	const matchers: { name: string; re: RegExp }[] = [
		{ name: 'Edge', re: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
		{ name: 'Opera', re: /OPR\/([\d.]+)/ },
		{ name: 'Vivaldi', re: /Vivaldi\/([\d.]+)/ },
		{ name: 'Chrome', re: /Chrome\/([\d.]+)/ },
		{ name: 'Firefox', re: /Firefox\/([\d.]+)/ },
		{ name: 'Safari', re: /Version\/([\d.]+).*Safari/ },
	];
	let browserName = 'unknown';
	let browserVersion = 'unknown';
	for (const { name, re } of matchers) {
		const m = ua.match(re);
		if (m) {
			browserName = name;
			browserVersion = m[1];
			break;
		}
	}

	// Brave hides as Chrome in UA + brand hints; its probe is the only tell.
	if (nav.brave?.isBrave) {
		browserName = 'Brave';
	}

	return { browserName, browserVersion };
}

export const SuggestedPromptCategory = {
	FollowUp: 'follow_up',
	EmptyState: 'empty_state',
} as const;
export type SuggestedPromptCategory =
	(typeof SuggestedPromptCategory)[keyof typeof SuggestedPromptCategory];

// `source` attribute on the AI Assistant `Opened` event — describes which
// surface triggered the open. Keep values stable: dashboards downstream
// depend on the literal strings.
export const AIAssistantOpenSource = {
	Icon: 'icon',
	Shortcut: 'shortcut',
	Cmdk: 'cmdk',
} as const;
export type AIAssistantOpenSource =
	(typeof AIAssistantOpenSource)[keyof typeof AIAssistantOpenSource];

// `source` attribute on the `VoiceInputUsed` event — which surface initiated
// the recording.
export const VoiceInputSource = {
	Button: 'button',
	Shortcut: 'shortcut',
} as const;
export type VoiceInputSource =
	(typeof VoiceInputSource)[keyof typeof VoiceInputSource];

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
