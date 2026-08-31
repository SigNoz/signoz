/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	SERVICE_NAME,
	servicesWithTopLevelOpsResponse,
} from './__story_mockdata__/serviceTopLevelOperations';

const LIST = 'Top level operations · list';

export const serviceTopLevelOperationsMocks = defineStoryMocks({
	controls: {
		operations: countControl('Operations', {
			group: LIST,
			description:
				'Entry-point spans the service reported. The page exists for the case where this runs past 2500, and the table pages at 100.',
			value: 24,
			max: 120,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v2/services',
			response.json(() => servicesWithTopLevelOpsResponse(values.operations)),
		),
	],
	config: () => ({ route: `/services/${SERVICE_NAME}/top-level-operations` }),
});
