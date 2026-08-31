/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { ingestionKeysResponse } from 'pages/Settings/Ingestion/__story_mockdata__/ingestion';
import { rolesListResponse } from 'pages/Settings/__story_mockdata__/roles';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

const SOURCE = 'Onboarding · source';

/**
 * `catalogue` is the picker itself; the rest are `getStartedSource` values,
 * which is how a docs link or an in-app card lands someone straight on a
 * source's setup instructions.
 */
const SOURCES = ['catalogue', 'quickstart', 'java', 'kubernetes'] as const;

type Source = (typeof SOURCES)[number];

const DATA_SOURCE_ID: Partial<Record<Source, string>> = {
	quickstart: 'quickstart',
	java: 'java',
	kubernetes: 'kubernetes-pod-logs',
};

/**
 * How far through the picker the story starts. The page asks one question at a
 * time and keeps the answers in component state, so a story reaches a later
 * question by answering the ones before it; `advanceToSetupStep` in the story
 * file walks Java → Spring Boot → VM.
 */
export const SETUP_STEPS = [
	'select-data-source',
	'select-framework',
	'select-environment',
	'ready-to-configure',
	'configure-product',
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

export const onboardingV2Mocks = defineStoryMocks({
	controls: {
		source: choiceControl<Source>('Data source', {
			group: SOURCE,
			description:
				'Which source the page opens on. Anything but `catalogue` arrives through the `getStartedSource` param and skips straight to step 2.',
			options: SOURCES,
			value: 'catalogue',
		}),
		step: choiceControl<SetupStep>('Setup step', {
			group: SOURCE,
			description:
				'How far through the catalogue the story is answered. Nothing to walk when the data source arrives through the param, which is already past every question.',
			options: SETUP_STEPS,
			value: 'select-data-source',
		}),
	},
	handlers: (_values, response) => [
		// The setup instructions quote the workspace's ingestion key, which is the
		// same payload the ingestion settings tab reads.
		rest.get(
			'http://localhost/api/v2/gateway/ingestion_keys',
			response.json(() => ingestionKeysResponse(1, ['logs', 'traces'], 'none', 1)),
		),
		// The header's invite modal offers the roles a new teammate can be given.
		rest.get(
			'http://localhost/api/v1/roles',
			response.json(() => rolesListResponse(0)),
		),
	],
	config: (values) => {
		const dataSource = DATA_SOURCE_ID[values.source];

		return {
			route: dataSource
				? `${ROUTES.GET_STARTED_WITH_CLOUD}?${QueryParams.getStartedSource}=${dataSource}`
				: ROUTES.GET_STARTED_WITH_CLOUD,
		};
	},
});
