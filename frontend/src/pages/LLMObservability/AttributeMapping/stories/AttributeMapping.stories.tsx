import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import LLMObservabilityPage from '../../index';
import {
	attributeMappingMocks,
	wideConditionGroup,
} from './AttributeMapping.stories.mocks';

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

/**
 * The conditions tooltip on every group header, held open: what a span has to
 * carry for the group to run. The first group matches on far more keys than the
 * tab's own fixture, so the Mapping groups control does not reach this story.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: [wideConditionGroup] } },
};
