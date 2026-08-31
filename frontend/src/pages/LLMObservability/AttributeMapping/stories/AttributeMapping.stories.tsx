import type { Meta, StoryObj } from '@storybook/react-vite';
import { rest } from 'msw';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import LLMObservabilityPage from '../../index';
import { attributeMappingMocks } from './AttributeMapping.stories.mocks';
import {
	MAPPING_GROUP_MAX,
	spanMapperGroupsResponse,
} from './__story_mockdata__/attributeMapping';

type AttributeMappingArgs = PageStoryArgs<typeof attributeMappingMocks>;

const pageStory = storyMocks(attributeMappingMocks, { layout: 'app' });

/**
 * Mapping groups that tell SigNoz which span attributes carry LLM data, and the
 * tab that tests a mapping against a sample span. Managing a group is gated on an
 * authz permission rather than a role.
 *
 * Route: `/ai-observability/attribute-mapping`.
 */
const meta = {
	title: 'Pages/AI Observability/Attribute Mapping',
	tags: ['authz'],
	component: LLMObservabilityPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AttributeMappingArgs>;

export default meta;

type Story = StoryObj<AttributeMappingArgs>;

/**
 * The rules that bring another SDK's span attributes onto the `gen_ai.*` names
 * the rest of AI observability reads.
 */
export const Default: Story = {};

/** No mapping set up yet, which is what a workspace on plain OTel stays on. */
export const NoGroups: Story = {
	args: { groups: 0 },
};

const MANY_ATTRIBUTES = [
	'langchain.model',
	'langchain.prompt_tokens',
	'langchain.completion_tokens',
	'langchain.chain.name',
	'langchain.chain.run_id',
	'langchain.retriever.source',
	'langchain.tool.invocation',
	'langchain.callbacks.handler_name',
];

const MANY_RESOURCE_KEYS = [
	'service.namespace',
	'deployment.environment.name',
	'telemetry.sdk.language',
];

const wideConditionGroup = rest.get(
	'http://localhost/api/v1/span_mapper_groups',
	(_req, res, ctx) => {
		const list = spanMapperGroupsResponse(MAPPING_GROUP_MAX);

		return res(
			ctx.status(200),
			ctx.json({
				...list,
				data: {
					items: list.data.items?.map((group, index) =>
						index === 0
							? {
									...group,
									condition: {
										attributes: MANY_ATTRIBUTES,
										resource: MANY_RESOURCE_KEYS,
									},
								}
							: group,
					),
				},
			}),
		);
	},
);

/**
 * The conditions tooltip on every group header, held open: what a span has to
 * carry for the group to run. The first group matches on far more keys than the
 * tab's own fixture, so the Mapping groups control does not reach this story.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: [wideConditionGroup] } },
};
