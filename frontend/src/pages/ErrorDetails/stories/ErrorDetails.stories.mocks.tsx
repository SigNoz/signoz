/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import ROUTES from 'constants/routes';

import { choiceControl, toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockResolver } from '@/storybook/msw/types';

import {
	DETAIL_PARAMS,
	type DetailParams,
	ERROR_EVENT_NOT_FOUND,
	errorDetailsSearch,
	errorEvent,
	errorNeighbours,
	EXCEPTION_LANGUAGES,
	type ExceptionLanguage,
	NEIGHBOUR_STATES,
	type NeighbourState,
} from './__story_mockdata__/errorDetails';

const eventNotFound: MockResolver = (_req, res, ctx) =>
	res(ctx.status(404), ctx.json(ERROR_EVENT_NOT_FOUND));

const EVENT = 'Exception details · event';
const NAVIGATION = 'Exception details · navigation';

export const errorDetailsMocks = defineStoryMocks({
	controls: {
		language: choiceControl<ExceptionLanguage>('Exception', {
			group: EVENT,
			description:
				'Which exception group the page is opened on, which is what the stack trace panel renders.',
			options: EXCEPTION_LANGUAGES,
			value: 'go',
		}),
		found: toggleControl('Event found', {
			group: EVENT,
			description:
				'Off, the lookup answers 404 and the page prints the error type it came back with. It answers that way whatever the Data control is set to, since a status code is not something a response body can carry.',
			value: true,
		}),
		params: choiceControl<DetailParams>('URL parameters', {
			group: NAVIGATION,
			description:
				'`group` is what the list links with and reads `/errorFromGroupID`; `event` carries the id Older and Newer add and reads `/errorFromErrorID`; `no-timestamp` is the incomplete link the page refuses to render.',
			options: DETAIL_PARAMS,
			value: 'group',
		}),
		neighbours: choiceControl<NeighbourState>('Neighbouring events', {
			group: NAVIGATION,
			description:
				'Which of Older and Newer the group has, and so which of the two buttons is enabled.',
			options: NEIGHBOUR_STATES,
			value: 'surrounded',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/errorFromGroupID',
			values.found
				? response.json((req) =>
						errorEvent(values.language, {
							timestamp: req.url.searchParams.get('timestamp'),
						}),
					)
				: eventNotFound,
		),

		rest.get(
			'http://localhost/api/v1/errorFromErrorID',
			values.found
				? response.json((req) =>
						errorEvent(values.language, {
							timestamp: req.url.searchParams.get('timestamp'),
							errorId: req.url.searchParams.get('errorID'),
						}),
					)
				: eventNotFound,
		),

		rest.get(
			'http://localhost/api/v1/nextPrevErrorIDs',
			response.json((req) =>
				errorNeighbours(
					values.language,
					values.neighbours,
					req.url.searchParams.get('timestamp'),
				),
			),
		),
	],
	config: (values) => ({
		route: `${ROUTES.ERROR_DETAIL}?${errorDetailsSearch(values.language, values.params)}`,
	}),
});
