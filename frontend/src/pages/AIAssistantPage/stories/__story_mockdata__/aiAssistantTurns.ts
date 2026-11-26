/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { MessageSummaryDTO } from '@signozhq/noz-client';
import {
	MessageContextDTOSource,
	MessageContextDTOType,
} from '@signozhq/noz-client';
import type { MessageBlock } from 'container/AIAssistant/types';

/** The opening question's contexts: the thread shows the @-picked ones, not the page it was asked from. */
export const SENT_CONTEXTS: MessageSummaryDTO['contexts'] = [
	{
		source: MessageContextDTOSource.auto,
		type: MessageContextDTOType.traces_explorer,
	},
	// Not a dashboard the picker offers, so the picker plays never find it in the thread instead.
	{
		source: MessageContextDTOSource.mention,
		type: MessageContextDTOType.dashboard,
		resourceId: 'dashboard-checkout-slos',
		resourceName: 'Checkout SLOs',
	},
	{
		source: MessageContextDTOSource.mention,
		type: MessageContextDTOType.service,
		resourceId: 'checkout',
		resourceName: 'checkout',
	},
];

export const FINAL_ANSWER =
	'`payment.svc.cluster.local:8080`. It answered `429` on 12% of calls between 14:00 and 15:00, and none in the hour before. The quota is 600 requests per minute and checkout alone asked for 780.';

export const oneStepBlocks = (): MessageBlock[] => [
	{
		type: 'tool_call',
		toolCallId: 'call-rate-limited-upstream',
		toolName: 'signoz_search_traces',
		displayText: 'Matched the 429s to their upstream',
		toolInput: {
			service: 'payment',
			filter: 'http.status_code = 429',
			groupBy: ['server.address', 'server.port'],
		},
		result: {
			'payment.svc.cluster.local:8080': { calls: 6525, rate_limited: 783 },
		},
		success: true,
	},
	{ type: 'text', content: FINAL_ANSWER },
];
