/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { ILog } from 'types/api/logs/log';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	attributeValuesResponse,
	filterSuggestionsResponse,
	logCountV3Response,
	logFieldKeysResponse,
	logFieldValuesResponse,
	LOG_SEVERITIES,
	logRowsV3Response,
	timeRangeState,
} from '../__story_mockdata__/logs';
import {
	DEPLOY_STATUSES,
	type DeployStatus,
	logsPipelinesResponse,
	PIPELINE_MAX,
	pipelinePreviewResponse,
	PROCESSOR_MAX,
	VERSION_MAX,
} from './__story_mockdata__/pipelines';

const LIST = 'Pipelines · list';
const DEPLOYMENT = 'Pipelines · deployment';
const PREVIEW = 'Pipelines · preview';

/** `useSampleLogs` asks for five, so a longer response is not one the backend sends. */
const SAMPLE_LOGS_REQUESTED = 5;

export const pipelinesMocks = defineStoryMocks({
	controls: {
		pipelines: countControl('Pipelines', {
			group: LIST,
			value: 3,
			max: PIPELINE_MAX,
		}),
		processors: countControl('Processors per pipeline', {
			group: LIST,
			description:
				'The operators a pipeline runs, listed when its row is expanded. A pipeline without any cannot be previewed.',
			value: 3,
			max: PROCESSOR_MAX,
		}),
		deployStatus: choiceControl<DeployStatus>('Deploy status', {
			group: DEPLOYMENT,
			description:
				'Where the latest config version got to. Anything other than deployed or failed keeps the page polling every three seconds.',
			options: DEPLOY_STATUSES,
			value: 'DEPLOYED',
		}),
		versions: countControl('Config versions', {
			group: DEPLOYMENT,
			description: 'How many versions the change history lists.',
			value: 4,
			max: VERSION_MAX,
		}),
		sampleLogs: countControl('Sample logs', {
			group: PREVIEW,
			description:
				"The logs a pipeline's filter matches, which the preview runs its processors over.",
			value: SAMPLE_LOGS_REQUESTED,
			max: SAMPLE_LOGS_REQUESTED,
		}),
	},
	handlers: (values, response) => {
		const pipelines = (): ReturnType<typeof logsPipelinesResponse> =>
			logsPipelinesResponse({
				pipelines: values.pipelines,
				processors: values.processors,
				deployStatus: values.deployStatus,
				versions: values.versions,
			});

		return [
			rest.get(
				'http://localhost/api/v1/logs/pipelines/:version',
				response.json(pipelines),
			),

			rest.post(
				'http://localhost/api/v1/logs/pipelines',
				response.json(pipelines),
			),

			rest.post(
				'http://localhost/api/v1/logs/pipelines/preview',
				response.json(async (req) => {
					const body = (await req.json()) as { logs: ILog[] };

					return pipelinePreviewResponse(body.logs);
				}),
			),

			// The preview queries on `DEFAULT_ENTITY_VERSION`, so it asks v3 rather
			// than the v5 endpoint the explorer uses: the panel type says whether it
			// wants the matching logs or how many there are.
			rest.post(
				'http://localhost/api/v3/query_range',
				response.json(async (req) => {
					const body = (await req.json()) as {
						end: number;
						compositeQuery: { panelType: PANEL_TYPES };
					};

					if (body.compositeQuery?.panelType === 'table') {
						return logCountV3Response(4213, body.end);
					}

					return logRowsV3Response(values.sampleLogs, LOG_SEVERITIES, body.end);
				}),
			),

			rest.get(
				'http://localhost/api/v3/filter_suggestions',
				response.json((req) =>
					filterSuggestionsResponse(req.url.searchParams.get('searchText') ?? ''),
				),
			),

			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json((req) =>
					logFieldKeysResponse(req.url.searchParams.get('searchText') ?? ''),
				),
			),

			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json((req) =>
					logFieldValuesResponse(
						req.url.searchParams.get('name') ?? '',
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),

			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_values',
				response.json((req) =>
					attributeValuesResponse(
						req.url.searchParams.get('attributeKey') ?? '',
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),
		];
	},
	config: () => ({
		route: ROUTES.LOGS_PIPELINES,
		reduxState: timeRangeState(),
	}),
});
