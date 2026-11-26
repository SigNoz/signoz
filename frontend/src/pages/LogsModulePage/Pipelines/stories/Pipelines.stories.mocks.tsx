/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { ILog } from 'types/api/logs/log';
import type {
	BuilderQuery,
	QueryRangeRequestV5,
} from 'types/api/v5/queryRange';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { queryRangeV5ScalarResponse } from '@/storybook/msw/__story_mockdata__/queryRange';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	infraMetricsResponse,
	logFieldKeysResponse,
	logFieldValuesResponse,
	LOG_SEVERITIES,
	logRowsResponse,
	timeRangeState,
} from '../../stories/__story_mockdata__/logs';
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

			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					const body = (await req.json()) as QueryRangeRequestV5;
					const spec = body.compositeQuery?.queries?.[0]?.spec as
						| BuilderQuery
						| undefined;

					// The preview's log detail drawer asks for its infra charts here.
					if (spec?.signal === 'metrics') {
						return infraMetricsResponse(body);
					}

					if (body.requestType === 'scalar') {
						return queryRangeV5ScalarResponse(4213);
					}

					return logRowsResponse(values.sampleLogs, LOG_SEVERITIES, body.end);
				}),
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
		];
	},
	config: () => ({
		route: ROUTES.LOGS_PIPELINES,
		reduxState: timeRangeState(),
	}),
});

export type PipelinesArgs = PageStoryArgs<typeof pipelinesMocks>;
