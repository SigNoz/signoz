import type { Meta, StoryObj } from '@storybook/react-vite';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { GlobalTimeProvider } from 'store/globalTime';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../../constants';
import EntityOverview, { EntityOverviewProps } from './EntityOverview';
import { overviewMocks } from './EntityOverview.stories.mocks';

import drawerStyles from '../entityDetails.module.scss';

const POD_UID = '63edbad0-398e-48e5-baba-f7ded7c73f1b';

/** The meta /api/v2/infra_monitoring/pods returns for one pod. */
const POD_ATTRIBUTES = {
	'k8s.pod.uid': POD_UID,
	'k8s.pod.name': 'app-demo-loadgenerator-579fbdd749-q5kgd',
	'k8s.namespace.name': 'generator',
	'k8s.cluster.name': 'mgmt',
	'k8s.node.name': 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-p6z7',
	'k8s.deployment.name': 'app-demo-loadgenerator',
};

const route = `/infrastructure-monitoring/kubernetes?${INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY}=pods&${INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM}=${POD_UID}`;

type OverviewArgs = PageStoryArgs<typeof overviewMocks> & EntityOverviewProps;

const meta = {
	title: 'Infra monitoring/Drawer overview tab',
	component: EntityOverview,
	...storyMocks(overviewMocks, { route }),
	decorators: [
		(Story): JSX.Element => (
			<DrawerWrapper
				open
				direction="right"
				title="app-demo-loadgenerator-579fbdd749-q5kgd"
				onOpenChange={(): void => undefined}
				className={drawerStyles.entityDetailDrawer}
			>
				<GlobalTimeProvider>
					<Story />
				</GlobalTimeProvider>
			</DrawerWrapper>
		),
	],
} satisfies Meta<OverviewArgs>;

export default meta;

type Story = StoryObj<OverviewArgs>;

export const Default: Story = {
	args: {
		category: InfraMonitoringEntity.PODS,
		eventEntity: 'pod',
		attributes: POD_ATTRIBUTES,
		entity: { podUID: POD_UID },
		entityName: POD_ATTRIBUTES['k8s.pod.name'],
		queryKeyPrefix: 'pod',
	},
};
