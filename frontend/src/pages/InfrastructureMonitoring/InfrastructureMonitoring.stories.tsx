import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { infraMonitoringMocks } from './InfrastructureMonitoring.stories.mocks';

import InfrastructureMonitoringPage from './InfrastructureMonitoringPage';

type InfraArgs = PageStoryArgs<typeof infraMonitoringMocks>;

const meta = {
	title: 'Pages/Infrastructure Monitoring',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...storyMocks(infraMonitoringMocks),
} satisfies Meta<InfraArgs>;

export default meta;

type Story = StoryObj<InfraArgs>;

/**
 * The Hosts tab with a full page of hosts: quick filters on the left, the status
 * toggle and group-by toolbar above the table, and an instrumentation checks
 * callout reporting an optional metric and a required attribute nobody is
 * sending yet.
 */
export const Default: Story = {};

/** The Kubernetes tab, listing pods across namespaces and clusters. */
export const Kubernetes: Story = {
	args: { tab: 'kubernetes' },
};

/**
 * A node's details drawer: the metrics widgets, with the logs, traces and events
 * tabs beside them.
 */
export const NodeDetails: Story = {
	args: {
		tab: 'kubernetes',
		category: InfraMonitoringEntity.NODES,
		drawer: true,
	},
};

/**
 * Rows grouped by one attribute: one expandable row per group, with the status
 * counts of the rows behind it.
 */
export const GroupedRows: Story = {
	args: { groupRows: true },
};

/** Nothing reporting yet, which is what a cluster with no collector shows. */
export const NoData: Story = {
	args: { rows: 0, checks: 'no-checks' },
};

/** The table and the drawer widgets mid-load, shell included. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};
