/**
 * Analytics event names for the AI Assistant feature. Backend-emitted events
 * (Execution finished, Approval resolved, Resource mutated, Clarification
 * requested, Limit hit) are not declared here — they fire from the AI service.
 */

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
	TraceDetails: 'trace_details',
	BottomStrip: 'bottom_strip',
} as const;
export type AIAssistantOpenSource =
	(typeof AIAssistantOpenSource)[keyof typeof AIAssistantOpenSource];

export enum AIAssistantEvents {
	Opened = 'AI Assistant: Opened',
	MessageSent = 'AI Assistant: Message sent',
	SuggestedPromptClicked = 'AI Assistant: Suggested prompt clicked',
	CancelClicked = 'AI Assistant: Cancel clicked',
	RegenerateClicked = 'AI Assistant: Regenerate clicked',
	RetryClicked = 'AI Assistant: Retry clicked',
	MessageCopied = 'AI Assistant: Message copied',
	FeedbackSubmitted = 'AI Assistant: Feedback submitted',
	ResourceOpened = 'AI Assistant: Resource opened',
	DocOpened = 'AI Assistant: Doc opened',
	ApplyFilterClicked = 'AI Assistant: Apply filter clicked',
	ThreadOpenedFromHistory = 'AI Assistant: Thread opened from history',
	NewChatClicked = 'AI Assistant: New chat clicked',
}
