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
	getDrawerHistoryDepth,
	useDrawerHistoryStore,
} from './useDrawerHistoryStore';

type DrawerArgs = PageStoryArgs<typeof drawerMocks> &
	K8sBaseDetailsProps<unknown> & { earlierSteps?: number };

const TRAIL: DrawerHistoryEntry[] = [
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

const route = `/infrastructure-monitoring/kubernetes?${INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY}=pods&${INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM}=${POD_UID}`;

const meta = {
	title: 'Infra monitoring/Kubernetes drawer',
	component: K8sBaseDetails as (props: DrawerArgs) => JSX.Element,
	...storyMocks(drawerMocks, { route }),
	decorators: [
		(Story, context): JSX.Element => {
			// The back control appears only for a resource opened from another
			const steps =
				context.args.earlierSteps ?? (context.args.openedFromANode ? 1 : 0);
			if (getDrawerHistoryDepth() !== steps) {
				useDrawerHistoryStore.setState({
					entries: TRAIL.slice(TRAIL.length - steps),
				});
			}

			return <Story />;
		},
	],
} satisfies Meta<DrawerArgs>;

export default meta;

type Story = StoryObj<DrawerArgs>;

/** A pod opened from a node's overview tab, so the header leads with the way back. */
export const Default: Story = {
	args: { ...podEntityConfig.details } as Partial<DrawerArgs> as DrawerArgs,
};

/** A pod drilled through a cluster, namespace, deployment and node, so the back control names the node. */
export const DeepTrail: Story = {
	args: {
		...podEntityConfig.details,
		earlierSteps: 4,
	} as Partial<DrawerArgs> as DrawerArgs,
};

/** A pod opened from the list, so the header shows the close control in place of back. */
export const OpenedFromTheList: Story = {
	args: {
		...podEntityConfig.details,
		openedFromANode: false,
	} as Partial<DrawerArgs> as DrawerArgs,
};
