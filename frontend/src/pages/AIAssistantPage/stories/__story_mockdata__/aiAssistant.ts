/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	ApprovalSummaryDTO,
	ChipsResponseDTO,
	ClarificationSummaryDTO,
	MessageActionDTO,
	MessageSummaryDTO,
	ThreadDetailResponseDTO,
	ThreadListResponseDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import {
	ApplyFilterSignalDTO,
	ApprovalActionTypeDTO,
	ApprovalStateDTO,
	ClarificationFieldTypeDTO,
	ClarificationStateDTO,
	FeedbackRatingDTO,
	MessageActionKindDTO,
	MessageContentTypeDTO,
	MessageRoleDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import type {
	Conversation,
	ConversationStreamState,
	MessageBlock,
} from 'container/AIAssistant/types';

export const THREAD_ID = 'thread-checkout-latency';

/** The thread a first visit mints, which the page opens with nothing in it. */
export const NEW_THREAD_ID = 'thread-new';

export const THREAD_TITLE = 'Checkout p99 regression after 14:00';

/** What the open thread contains, one entry per turn the builder can add. */
export const THREAD_PARTS = [
	'prose',
	'table',
	'code',
	'activity',
	'actions',
	'question',
	'checkboxes',
	'confirm',
	'suggested-action',
	'voted',
] as const;

export type ThreadPart = (typeof THREAD_PARTS)[number];

/** What the agent is doing when the thread opens. */
export const AGENT_STATES = [
	'idle',
	'streaming',
	'awaiting-approval',
	'awaiting-clarification',
] as const;

export type AgentState = (typeof AGENT_STATES)[number];

/**
 * Every interactive block reads `answeredBlocks[messageId]`, so a message holds
 * at most one of them: answering either block of a pair would otherwise mark
 * both. Reported as an app bug.
 */
export const MESSAGE_IDS = {
	analysis: 'message-analysis',
	question: 'message-question',
	checkboxes: 'message-checkboxes',
	confirm: 'message-confirm',
	suggestedAction: 'message-suggested-action',
	final: 'message-final',
} as const;

export const EXECUTION_ID = 'execution-checkout-latency';

// ---------------------------------------------------------------------------
// Assistant prose
// ---------------------------------------------------------------------------

const PROSE = `### What changed

\`checkout\` p99 went from **180 ms to 640 ms** at 14:05, and the whole increase sits in the
\`payment.authorize\` span. That span started retrying against a rate-limited upstream, so the
extra time is retry wait rather than compute.

- 12% of calls to \`payment.svc.cluster.local:8080\` answered \`429\`, up from none before 14:00
- retries are capped at three, which matches the 3x jump in span duration
- no deploy landed in the window, so this is upstream capacity and not a regression you shipped

> The upstream quota window resets at 14:00 UTC, which is exactly where the 429s begin.

The escalation path is in the [payment rate limit runbook](https://signoz.io/docs/userguide/payment-rate-limits/).`;

const TABLE = `| Service | p99 before | p99 after | Change | Error rate | Slowest span |
| --- | --- | --- | --- | --- | --- |
| checkout | 180 ms | 640 ms | +256% | 0.4% -> 2.1% | payment.authorize |
| payment | 95 ms | 410 ms | +331% | 0.1% -> 12.0% | upstream.authorize.retry |
| cart | 62 ms | 66 ms | +6% | 0.0% | redis.get |
| catalogue | 44 ms | 45 ms | +2% | 0.0% | postgres.query.products |
| notifications | 210 ms | 214 ms | +2% | 0.2% | kafka.publish |`;

/** The first line runs past the chat column, which is what makes the block scroll. */
const CODE = `Here is the query that isolates the retries:

\`\`\`sql
SELECT toStartOfMinute(timestamp) AS minute, quantile(0.99)(duration_nano / 1e6) AS p99_ms, countIf(status_code = 429) AS rate_limited, count() AS calls
FROM signoz_traces.distributed_signoz_index_v3
WHERE service_name = 'payment'
  AND name = 'upstream.authorize.retry'
  AND timestamp >= now() - INTERVAL 2 HOUR
GROUP BY minute
ORDER BY minute ASC
\`\`\``;

const proseFor = (parts: readonly ThreadPart[]): string =>
	[
		parts.includes('prose') ? PROSE : '',
		parts.includes('table') ? TABLE : '',
		parts.includes('code') ? CODE : '',
	]
		.filter(Boolean)
		.join('\n\n') || 'The whole increase sits in the `payment.authorize` span.';

// ---------------------------------------------------------------------------
// Blocks
//
// `MessageSummaryDTO.blocks` is `unknown[]`, so the builders type against the
// union the renderer narrows to and cast once on the way into the payload.
// ---------------------------------------------------------------------------

const asBlocks = (blocks: MessageBlock[]): MessageSummaryDTO['blocks'] =>
	blocks as unknown as MessageSummaryDTO['blocks'];

const activityBlocks = (text: string): MessageBlock[] => [
	{
		type: 'thinking',
		content:
			'The jump is sharp rather than gradual, so a capacity change is more likely than a slow leak. Comparing the span breakdown either side of 14:00 should say which span carries it, and the logs for that span should say why.',
	},
	{
		type: 'tool_call',
		toolCallId: 'call-service-metrics',
		toolName: 'signoz_query_service_metrics',
		displayText: 'Compared checkout p99 either side of 14:00',
		toolInput: {
			service: 'checkout',
			metrics: ['p99', 'error_rate'],
			window: { from: '2026-08-28T13:30:00Z', to: '2026-08-28T14:30:00Z' },
			groupBy: ['span_name'],
		},
		result: {
			p99_before_ms: 180.4,
			p99_after_ms: 640.2,
			top_span: 'payment.authorize',
			contribution: 0.97,
		},
		success: true,
	},
	{
		type: 'tool_call',
		toolCallId: 'call-search-logs',
		toolName: 'signoz_search_logs',
		toolInput: {
			expression:
				"service.name = 'payment' AND severity_text = 'WARN' AND body CONTAINS 'rate limit'",
			limit: 200,
		},
		result:
			'187 of 200 matching lines read: upstream rate limit hit for tenant=acme quota=payment.authorize window=60s retry_after=1.5s remaining=0 endpoint=payment.svc.cluster.local:8080 request_id=01J9Z4Q0R7X2N8M4K6H1F3D5B7',
		success: true,
	},
	{ type: 'text', content: text },
	{
		type: 'tool_call',
		toolCallId: 'call-quota',
		toolName: 'signoz_get_upstream_quota',
		displayText: 'Read the upstream quota window',
		toolInput: { endpoint: 'payment.svc.cluster.local:8080' },
		result: { quota: 600, window_seconds: 60, resets_at: '14:00:00Z' },
		success: true,
	},
];

const ACTIONS: MessageActionDTO[] = [
	{
		kind: MessageActionKindDTO.follow_up,
		label: 'Show the retry spans',
		input: {
			intent: 'Show me the payment.authorize retry spans between 14:00 and 15:00.',
		},
	},
	{
		kind: MessageActionKindDTO.apply_filter,
		label: 'Filter logs to the 429s',
		signal: ApplyFilterSignalDTO.logs,
		tooltip: 'Opens the logs explorer with the rate-limit filter applied',
		query: {
			compositeQuery: {
				queries: [
					{
						type: 'builder_query',
						spec: {
							name: 'A',
							signal: 'logs',
							filter: {
								expression: "service.name = 'payment' AND http.status_code = 429",
							},
						},
					},
				],
			},
		},
	},
	{
		kind: MessageActionKindDTO.open_resource,
		label: 'Open the Checkout dashboard',
		resourceType: 'dashboard',
		resourceId: 'storybook-dashboard-1',
	},
	{
		kind: MessageActionKindDTO.open_docs,
		label: 'Rate limit runbook',
		url: 'https://signoz.io/docs/userguide/payment-rate-limits/',
	},
	{
		kind: MessageActionKindDTO.undo,
		label: 'Undo the threshold change',
		actionMetadataId: 'action-threshold-change',
		resourceType: 'alert',
		resourceId: 'alert-checkout-p99',
		state: 'applied',
	},
	{
		kind: MessageActionKindDTO.revert,
		label: 'Revert the dashboard panel',
		actionMetadataId: 'action-dashboard-panel',
		resourceType: 'dashboard',
		resourceId: 'storybook-dashboard-1',
	},
	{
		kind: MessageActionKindDTO.restore,
		label: 'Restore the archived view',
		actionMetadataId: 'action-archived-view',
		resourceType: 'saved_view',
		resourceId: 'view-payment-retries',
	},
];

// ---------------------------------------------------------------------------
// Interactive blocks. The agent emits these as fenced `ai-<type>` code blocks,
// which `RichCodeBlock` resolves against the block registry.
// ---------------------------------------------------------------------------

const fence = (type: string, data: unknown): string =>
	['```ai-'.concat(type), JSON.stringify(data, null, 2), '```'].join('\n');

const QUESTION_BLOCK = fence('question', {
	question: 'Which signal should the alert watch?',
	type: 'radio',
	options: [
		{ value: 'p99', label: 'Trace p99 on checkout' },
		{ value: 'errors', label: 'Error rate on payment' },
		{ value: 'rate-limited', label: 'Upstream 429 count' },
	],
});

const CHECKBOX_BLOCK = fence('question', {
	question: 'Who should the alert notify?',
	type: 'checkbox',
	options: [
		'#checkout-oncall',
		'payments-team@signoz.io',
		'PagerDuty: payments',
	],
});

const CONFIRM_BLOCK = fence('confirm', {
	// The block renders its message as plain text, so markdown would show as
	// literal asterisks.
	message:
		"I'll create the alert Checkout p99 > 500 ms, evaluated every minute over a 5 minute window, notifying #checkout-oncall and PagerDuty.",
	acceptLabel: 'Create the alert',
	rejectLabel: 'Not now',
	acceptText: 'Yes, create it.',
	rejectText: 'No, leave it for now.',
});

const ACTION_BLOCK = fence('action', {
	actionId: 'logs.applyFilter',
	description: 'Filter the logs explorer to the failing payment retries.',
	parameters: {
		signal: 'logs',
		expression: "service.name = 'payment' AND http.status_code = 429",
		from: '2026-08-28T14:00:00Z',
		to: '2026-08-28T15:00:00Z',
	},
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type Turn = Omit<MessageSummaryDTO, 'createdAt' | 'updatedAt'>;

const user = (id: string, content: string): Turn => ({
	messageId: id,
	role: MessageRoleDTO.user,
	contentType: MessageContentTypeDTO.markdown,
	content,
});

const assistant = (
	id: string,
	content: string,
	extra: Partial<Turn> = {},
): Turn => ({
	messageId: id,
	role: MessageRoleDTO.assistant,
	contentType: MessageContentTypeDTO.markdown,
	content,
	complete: true,
	...extra,
});

const turnsFor = (parts: readonly ThreadPart[]): Turn[] => {
	const prose = proseFor(parts);
	const turns: Turn[] = [
		user(
			'message-opening',
			'Why did checkout get slower after 14:00? Deploys look clean.',
		),
		assistant(MESSAGE_IDS.analysis, prose, {
			blocks: parts.includes('activity')
				? asBlocks(activityBlocks(prose))
				: undefined,
			actions: parts.includes('actions') ? ACTIONS : undefined,
		}),
	];

	if (parts.includes('question')) {
		turns.push(
			user('message-alert-ask', 'Can you set up an alert so we catch it sooner?'),
			assistant(
				MESSAGE_IDS.question,
				`Before I create it, one choice.\n\n${QUESTION_BLOCK}`,
			),
		);
	}

	if (parts.includes('checkboxes')) {
		turns.push(
			user('message-signal-pick', 'Trace p99 on checkout.'),
			assistant(MESSAGE_IDS.checkboxes, `Got it. One more.\n\n${CHECKBOX_BLOCK}`),
		);
	}

	if (parts.includes('confirm')) {
		turns.push(
			user('message-notify-pick', '#checkout-oncall and PagerDuty.'),
			assistant(MESSAGE_IDS.confirm, CONFIRM_BLOCK),
		);
	}

	if (parts.includes('suggested-action')) {
		turns.push(
			user('message-logs-ask', 'Show me the failing retries in the logs.'),
			assistant(
				MESSAGE_IDS.suggestedAction,
				`The retries are all on one endpoint, so a single filter covers them.\n\n${ACTION_BLOCK}`,
			),
		);
	}

	turns.push(
		user('message-upstream-ask', 'Which upstream is rate-limiting us?'),
		assistant(
			MESSAGE_IDS.final,
			'`payment.svc.cluster.local:8080`. It answered `429` on 12% of calls between 14:00 and 15:00, and none in the hour before. The quota is 600 requests per minute and checkout alone asked for 780.',
			{
				feedbackRating: parts.includes('voted')
					? FeedbackRatingDTO.positive
					: undefined,
			},
		),
	);

	return turns;
};

/** Chronological, ending a few minutes ago so the feedback bar reads fresh. */
const stamped = (turns: Turn[]): MessageSummaryDTO[] => {
	const last = Date.now() - 4 * 60_000;
	const step = 40_000;
	const first = last - (turns.length - 1) * step;

	return turns.map((turn, index) => {
		const at = new Date(first + index * step).toISOString();
		return { ...turn, createdAt: at, updatedAt: at };
	});
};

// ---------------------------------------------------------------------------
// Pending user input
// ---------------------------------------------------------------------------

const pendingApproval = (): ApprovalSummaryDTO => ({
	approvalId: 'approval-checkout-alert',
	executionId: EXECUTION_ID,
	sourceMessageId: MESSAGE_IDS.final,
	state: ApprovalStateDTO.pending,
	actionType: ApprovalActionTypeDTO.modify,
	resourceType: 'alert',
	summary:
		'Raise the Checkout p99 alert threshold to 500 ms and add the upstream 429 count as a second condition.',
	diff: {
		before: {
			alert: 'Checkout p99',
			condition: {
				target: 800,
				op: '>',
				matchType: 'atleastOnce',
				evalWindow: '5m0s',
			},
			labels: { severity: 'warning', team: 'checkout' },
			preferredChannels: ['#checkout-oncall'],
		},
		after: {
			alert: 'Checkout p99',
			condition: {
				target: 500,
				op: '>',
				matchType: 'allTheTimes',
				evalWindow: '5m0s',
				secondary: { metric: 'upstream_429_total', target: 50, op: '>' },
			},
			labels: {
				severity: 'critical',
				team: 'checkout',
				runbook: 'payment-rate-limits',
			},
			preferredChannels: ['#checkout-oncall', 'PagerDuty: payments'],
		},
	},
	createdAt: new Date(Date.now() - 30_000).toISOString(),
});

const pendingClarification = (): ClarificationSummaryDTO => ({
	clarificationId: 'clarification-alert-scope',
	executionId: EXECUTION_ID,
	sourceMessageId: MESSAGE_IDS.final,
	state: ClarificationStateDTO.pending,
	message:
		'I can create the alert, but a few details change what it watches and who hears about it.',
	fields: [
		{
			id: 'service',
			type: ClarificationFieldTypeDTO.select,
			label: 'Service to watch',
			required: true,
			options: ['checkout', 'payment', 'cart'],
			default: 'checkout',
		},
		{
			id: 'window',
			type: ClarificationFieldTypeDTO.number,
			label: 'Evaluation window (minutes)',
			required: true,
			default: '5',
		},
		{
			id: 'severity',
			type: ClarificationFieldTypeDTO.select,
			label: 'Severity',
			options: ['critical', 'warning', 'info'],
			allowCustom: true,
			default: 'warning',
		},
		{
			id: 'channels',
			type: ClarificationFieldTypeDTO.multi_select,
			label: 'Notify',
			required: true,
			options: [
				'#checkout-oncall',
				'payments-team@signoz.io',
				'PagerDuty: payments',
			],
			allowCustom: true,
			default: ['#checkout-oncall'],
		},
		{
			id: 'includeTraces',
			type: ClarificationFieldTypeDTO.boolean,
			label: 'Attach example traces to the notification',
			default: 'true',
		},
		{
			id: 'note',
			type: ClarificationFieldTypeDTO.text,
			label: 'Anything else I should know?',
		},
	],
	createdAt: new Date(Date.now() - 30_000).toISOString(),
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export const threadDetailResponse = (
	parts: readonly ThreadPart[],
	agent: AgentState,
): ThreadDetailResponseDTO => {
	const messages = stamped(turnsFor(parts));

	return {
		threadId: THREAD_ID,
		title: THREAD_TITLE,
		archived: false,
		createdAt: messages[0].createdAt,
		updatedAt: messages[messages.length - 1].createdAt,
		messages,
		// `activeExecutionId` would reconnect the stream and overwrite the seeded
		// one, so the streaming state is left to the store.
		activeExecutionId: null,
		pendingApproval: agent === 'awaiting-approval' ? pendingApproval() : null,
		pendingClarification:
			agent === 'awaiting-clarification' ? pendingClarification() : null,
	};
};

/**
 * Ages that put the list across every bucket `groupByDate` builds: today,
 * yesterday, last 7 days, last 30 days and older.
 */
const AGES_IN_MINUTES = [
	4, 95, 1_700, 4_400, 15_000, 65_000, 30, 300, 2_000, 6_000, 20_000, 90_000,
];

const TITLES = [
	THREAD_TITLE,
	'Which endpoints are burning the most ingestion quota?',
	'Kafka consumer lag on the notifications topic',
	'Why are the ingestion workers restarting every twenty minutes on the production cluster?',
	'Trace sampling rate for the cart service',
	'Postgres connection pool saturation last Friday',
	'Cost per service for August',
	'Set up an alert for 5xx on the public API',
	'Missing spans between gateway and auth',
	'Log volume spike from the batch importer',
	'Dashboard for the payments team',
	'Retention on the debug log pipeline',
];

const ARCHIVED_TITLES = [
	'Migrating the old APM dashboards',
	'Alert noise from the staging cluster',
	'Instrumenting the Go workers',
	'Trace comparison for release 1.42',
	'Cost meter setup',
	'Old runbook questions',
];

export const threadListResponse = (
	count: number,
	archived: boolean,
): ThreadListResponseDTO => {
	const titles = archived ? ARCHIVED_TITLES : TITLES;

	return {
		threads: Array.from({ length: count }, (_unused, index) => {
			const at = new Date(
				Date.now() - AGES_IN_MINUTES[index % AGES_IN_MINUTES.length] * 60_000,
			).toISOString();

			return {
				threadId:
					!archived && index === 0
						? THREAD_ID
						: `${archived ? 'thread-archived' : 'thread'}-${index}`,
				title: titles[index % titles.length],
				createdAt: at,
				updatedAt: at,
				archived,
			};
		}),
		hasMore: false,
	};
};

/** The prompts the empty conversation offers before anything is typed. */
export const chipsResponse = (): ChipsResponseDTO => ({
	chips: [
		{ id: 'top-errors', text: 'Show me the top errors in the last hour' },
		{ id: 'slowest-services', text: 'What services have the highest latency?' },
		{ id: 'slow-queries', text: 'Find slow database queries' },
		{ id: 'health-overview', text: 'Give me an overview of system health' },
	],
});

/**
 * One SSE execution, delivered in a single body: msw answers a mocked `fetch`
 * with the whole stream at once, and the reader splits it back into events. The
 * text delta still animates word by word, so a send in a story looks like a
 * send in the app.
 */
export const executionEvents = (): string =>
	[
		{ type: 'status', state: 'running' },
		{
			type: 'thinking',
			content:
				'The thread already has the span breakdown, so the remaining question is whether the quota is per tenant or per endpoint.',
		},
		{
			type: 'tool_call',
			toolName: 'signoz_get_upstream_quota',
			displayText: 'Read the upstream quota window',
			toolInput: { endpoint: 'payment.svc.cluster.local:8080' },
		},
		{
			type: 'tool_result',
			toolName: 'signoz_get_upstream_quota',
			result: { quota: 600, window_seconds: 60, scope: 'per_tenant' },
		},
		{
			type: 'message',
			messageId: 'message-streamed',
			delta:
				'The quota is per tenant: 600 requests a minute across every endpoint, and checkout alone asked for 780 between 14:00 and 15:00. Raising the retry budget would make it worse, so the fix is either a quota increase or a client-side limiter in front of `payment.authorize`.',
			done: false,
		},
		{ type: 'message', messageId: 'message-streamed', done: true },
		{ type: 'done' },
	]
		.map((event) => `data: ${JSON.stringify(event)}\n\n`)
		.join('');

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

/**
 * The entry the page resumes on. Empty and hydrating is what the app restores
 * from its persisted active thread, and what makes `fetchThreads` follow up with
 * the thread detail the handlers answer.
 */
export const openConversation = (): Conversation => ({
	id: THREAD_ID,
	threadId: THREAD_ID,
	title: THREAD_TITLE,
	messages: [],
	createdAt: Date.now() - 20 * 60_000,
	updatedAt: Date.now() - 4 * 60_000,
	isHydrating: true,
});

export const newConversation = (): Conversation => ({
	id: NEW_THREAD_ID,
	messages: [],
	createdAt: Date.now(),
	updatedAt: Date.now(),
});

/**
 * A stream caught mid-answer: a finished step, some text, and a step still
 * running, which is the trailing group the elapsed timer ticks on.
 */
export const streamingState = (): ConversationStreamState => ({
	isStreaming: true,
	streamingStatus: 'running',
	streamingMessageId: 'message-streaming',
	streamingActions: null,
	pendingApproval: null,
	pendingClarification: null,
	streamingContent:
		'The quota is per tenant rather than per endpoint, so every service shares the same 600 requests a minute.',
	streamingEvents: [
		{
			kind: 'thinking',
			content:
				'The span breakdown is already in the thread, so what is left is whether the quota is scoped to the tenant or to the endpoint.',
		},
		{
			kind: 'tool',
			toolCall: {
				toolName: 'signoz_get_upstream_quota',
				displayText: 'Read the upstream quota window',
				input: { endpoint: 'payment.svc.cluster.local:8080' },
				result: { quota: 600, window_seconds: 60, scope: 'per_tenant' },
				done: true,
			},
		},
		{
			kind: 'text',
			content:
				'The quota is per tenant rather than per endpoint, so every service shares the same 600 requests a minute.',
		},
		{
			kind: 'thinking',
			content: 'Checking how much of that budget checkout asked for on its own.',
		},
		{
			kind: 'tool',
			toolCall: {
				toolName: 'signoz_query_service_metrics',
				displayText: 'Counting checkout calls per minute',
				input: { service: 'checkout', metric: 'upstream_calls_total' },
				done: false,
			},
		},
	],
});

/**
 * What each interactive block stores once the user has picked. The shape is
 * per block: a question keeps the answer text, a confirm the choice, an action
 * its outcome.
 */
export const answeredBlocks = (): Record<string, string> => ({
	[MESSAGE_IDS.question]: 'Trace p99 on checkout',
	[MESSAGE_IDS.checkboxes]: '#checkout-oncall, PagerDuty: payments',
	[MESSAGE_IDS.confirm]: 'accepted',
	[MESSAGE_IDS.suggestedAction]:
		'applied:Filtered the logs explorer to 429s on payment.',
});
