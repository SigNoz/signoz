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
	getDrawerHistoryDepth,
	pushDrawerHistory,
	resetDrawerHistory,
} from './useDrawerHistoryStore';

type DrawerArgs = PageStoryArgs<typeof drawerMocks> &
	K8sBaseDetailsProps<unknown>;

const route = `/infrastructure-monitoring/kubernetes?${INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY}=pods&${INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM}=${POD_UID}`;

const meta = {
	title: 'Infra monitoring/Kubernetes drawer',
	component: K8sBaseDetails as (props: DrawerArgs) => JSX.Element,
	...storyMocks(drawerMocks, { route }),
	decorators: [
		(Story, context): JSX.Element => {
			// The back control appears only for a resource opened from another
			const depth = getDrawerHistoryDepth();
			if (context.args.openedFromANode && depth === 0) {
				pushDrawerHistory({
					params: { selectedItem: NODE_NAME, category: InfraMonitoringEntity.NODES },
					category: InfraMonitoringEntity.NODES,
					label: NODE_NAME,
					entity: { nodeName: NODE_NAME },
					queryKeyPrefix: 'node',
				});
			}
			if (!context.args.openedFromANode && depth > 0) {
				resetDrawerHistory();
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
