/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	AiobservabilitytypesChatMessageDTO,
	AiobservabilitytypesOutputMessageDTO,
	AiobservabilitytypesPartDTO,
} from 'api/generated/services/sigNoz.schemas';

import type { THREAD_PAGINGS, THREAD_SCENARIOS } from './traceThread';

export type ThreadScenario = (typeof THREAD_SCENARIOS)[number];

export type ThreadPaging = (typeof THREAD_PAGINGS)[number];

export type Part = AiobservabilitytypesPartDTO;
export type InputMessage = AiobservabilitytypesChatMessageDTO;
export type OutputMessage = AiobservabilitytypesOutputMessageDTO;

export interface ThreadSpanTemplate {
	name: string;
	operation: 'chat' | 'execute_tool' | 'invoke_agent';
	input?: InputMessage[];
	output?: OutputMessage[];
	/** Raw `gen_ai.*.messages`, for spans the backend could not format. */
	rawInput?: unknown;
	rawOutput?: unknown;
}

export interface ThreadPageOptions {
	scenario: ThreadScenario;
	paging: ThreadPaging;
	traceStart: number;
	after: string | null;
	/** The span the tab opened on; the first page extends to include it. */
	spanId?: string;
}
