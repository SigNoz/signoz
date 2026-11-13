import { type ReactNode, useLayoutEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { podEntityConfig } from '../Pods/entity.config';
import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../constants';
import K8sBaseDetails from './K8sBaseDetails';
import {
	drawerMocks,
	NODE_NAME,
	POD_UID,
} from './K8sBaseDetails.stories.mocks';
import type { K8sBaseDetailsProps } from './types';
import {
	DrawerHistoryEntry,
	useDrawerHistoryStore,
} from './useDrawerHistoryStore';

type DrawerArgs = PageStoryArgs<typeof drawerMocks> &
	K8sBaseDetailsProps<unknown>;

const EARLIER_STEPS: DrawerHistoryEntry[] = [
	{
		category: InfraMonitoringEntity.CLUSTERS,
		label: 'mgmt',
		queryKeyPrefix: 'cluster',
	},
	{
		category: InfraMonitoringEntity.NAMESPACES,
		label: 'generator',
		queryKeyPrefix: 'namespace',
	},
	{
		category: InfraMonitoringEntity.DEPLOYMENTS,
		label: 'app-demo-loadgenerator',
		queryKeyPrefix: 'deployment',
	},
	{
		category: InfraMonitoringEntity.NODES,
		label: NODE_NAME,
		queryKeyPrefix: 'node',
	},
].map(({ category, label, queryKeyPrefix }) => ({
	params: { selectedItem: label, category },
	category,
	label,
	entity: { name: label },
	queryKeyPrefix,
}));

function SeededTrail({
	earlierSteps,
	children,
}: {
	earlierSteps: number;
	children: ReactNode;
}): JSX.Element {
	const [isSeeded, setIsSeeded] = useState(false);

	useLayoutEffect(() => {
		useDrawerHistoryStore.setState({
			entries: EARLIER_STEPS.slice(
				Math.max(EARLIER_STEPS.length - earlierSteps, 0),
			),
		});
		setIsSeeded(true);
	}, [earlierSteps]);

	return <>{isSeeded ? children : null}</>;
}

const route = `/infrastructure-monitoring/kubernetes?${INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY}=pods&${INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM}=${POD_UID}`;

const meta = {
	title: 'Infra monitoring/Kubernetes drawer',
	component: K8sBaseDetails as (props: DrawerArgs) => JSX.Element,
	...storyMocks(drawerMocks, { route }),
	decorators: [
		(Story, context): JSX.Element => (
			<SeededTrail earlierSteps={context.args.earlierSteps}>
				<Story />
			</SeededTrail>
		),
	],
} satisfies Meta<DrawerArgs>;

export default meta;

type Story = StoryObj<DrawerArgs>;

/** A pod opened from a node's overview tab, so a trail under the header leads back. */
export const Default: Story = {
	args: { ...podEntityConfig.details } as Partial<DrawerArgs> as DrawerArgs,
};

/** A pod several resources deep, so the trail folds its earliest steps into the `...` crumb. */
export const DeepTrail: Story = {
	args: {
		...podEntityConfig.details,
		earlierSteps: 4,
	} as Partial<DrawerArgs> as DrawerArgs,
};

/** A pod opened from the list, so there is no trail. */
export const OpenedFromTheList: Story = {
	args: {
		...podEntityConfig.details,
		earlierSteps: 0,
	} as Partial<DrawerArgs> as DrawerArgs,
};
