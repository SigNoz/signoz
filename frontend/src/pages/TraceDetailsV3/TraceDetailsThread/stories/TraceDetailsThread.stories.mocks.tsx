/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	scenarioSpanCount,
	STORY_TRACE_ID,
} from '../../stories/__story_mockdata__/traceDetails';
import { traceDetailsMocks } from '../../stories/TraceDetailsV3.stories.mocks';
import { ThreadView } from '../types';
import {
	SECOND_PAGE_CURSOR,
	SPAN_WITHOUT_MESSAGES,
	THREAD_PAGINGS,
	THREAD_SCENARIOS,
	type ThreadPaging,
	type ThreadScenario,
	threadSpanIdAt,
	traceThreadResponse,
} from './__story_mockdata__/traceThread';

const MESSAGES = 'Thread · messages';
const NAVIGATION = 'Thread · navigation';

const THREAD_VIEWS = [ThreadView.Formatted, ThreadView.Json] as const;

const ANCHORS = [
	'none',
	'span-in-thread',
	'span-without-messages',
	'span-not-found',
] as const;

type Anchor = (typeof ANCHORS)[number];

const TRACE_AGE_MS = 2 * 60 * 1000;

const interestedSpanId = (anchor: Anchor): string | undefined => {
	switch (anchor) {
		case 'span-in-thread':
			return threadSpanIdAt(1);
		case 'span-without-messages':
			return SPAN_WITHOUT_MESSAGES;
		case 'span-not-found':
			return 'deadbeefdeadbeef';
		default:
			return undefined;
	}
};

/** The header, and the span panel a card opens, come from the overview's mocks. */
const overviewValues = traceDetailsMocks.read({
	scenario: 'ai',
	spans: scenarioSpanCount('ai'),
	spanPanel: false,
});

export const traceThreadMocks = defineStoryMocks({
	controls: {
		scenario: choiceControl<ThreadScenario>('Scenario', {
			group: MESSAGES,
			description:
				'The spans the thread returns: a tool-calling conversation, one card per message part type, every role and finish reason, spans the backend could not format (raw attributes only), or none at all.',
			options: THREAD_SCENARIOS,
			value: 'conversation',
		}),
		view: choiceControl<ThreadView>('View', {
			group: MESSAGES,
			description: 'Formatted messages, or the raw gen_ai.*.messages JSON.',
			options: THREAD_VIEWS,
			value: ThreadView.Formatted,
		}),
		anchor: choiceControl<Anchor>('Opened on span', {
			group: NAVIGATION,
			description:
				'The spanId the tab opens with. A span in the thread scrolls to it and opens the span panel; one the backend dropped for lacking messages shows the notice above the thread; one that is not in the trace answers 404.',
			options: ANCHORS,
			value: 'none',
		}),
		paging: choiceControl<ThreadPaging>('Paging', {
			group: NAVIGATION,
			description:
				'Whether the thread arrives in one page, in two (the second loads as the list end scrolls into view), or with a second page that never answers.',
			options: THREAD_PAGINGS,
			value: 'single-page',
		}),
	},
	handlers: (values, response) => {
		const traceStart = Date.now() - TRACE_AGE_MS;

		return [
			rest.get(
				'http://localhost/api/v1/traces/:traceId/thread',
				(req, res, ctx) => {
					const { searchParams } = req.url;

					if (values.anchor === 'span-not-found' && searchParams.get('spanId')) {
						return res(
							ctx.status(404),
							ctx.json({
								status: 'error',
								error: { code: 'not_found', message: 'span not found' },
							}),
						);
					}

					if (
						values.paging === 'next-page-pending' &&
						searchParams.get('after') === SECOND_PAGE_CURSOR
					) {
						return res(ctx.delay('infinite'));
					}

					return undefined;
				},
			),
			rest.get(
				'http://localhost/api/v1/traces/:traceId/thread',
				response.json((req) =>
					traceThreadResponse({
						scenario: values.scenario,
						paging: values.paging,
						traceStart,
						after: req.url.searchParams.get('after'),
					}),
				),
			),
			...(traceDetailsMocks.handlers?.(overviewValues, response) ?? []),
		];
	},
	config: (values) => {
		const params = new URLSearchParams({ tab: 'thread' });
		if (values.view === ThreadView.Json) {
			params.set('view', ThreadView.Json);
		}
		const spanId = interestedSpanId(values.anchor);
		if (spanId) {
			params.set('spanId', spanId);
		}

		return { route: `/trace/${STORY_TRACE_ID}?${params.toString()}` };
	},
});

/** The thread renders once its first page resolves, which outlasts the 1s default. */
export const untilThreadLoaded = { timeout: 15_000 };
