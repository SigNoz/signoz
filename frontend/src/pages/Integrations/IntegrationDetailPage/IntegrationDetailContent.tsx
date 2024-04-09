import './IntegrationDetailPage.styles.scss';

import { Button, Tabs, TabsProps, Typography } from 'antd';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import { CableCar, Group } from 'lucide-react';
import { IntegrationDetailedProps } from 'types/api/integrations/types';

import Configure from './IntegrationDetailContentTabs/Configure';
import DataCollected from './IntegrationDetailContentTabs/DataCollected';
import Overview from './IntegrationDetailContentTabs/Overview';

interface IntegrationDetailContentProps {
	activeDetailTab: string;
	integrationData: IntegrationDetailedProps;
	integrationId: string;
	setActiveDetailTab: React.Dispatch<React.SetStateAction<string | null>>;
}

function IntegrationDetailContent(
	props: IntegrationDetailContentProps,
): JSX.Element {
	const {
		activeDetailTab,
		integrationData,
		integrationId,
		setActiveDetailTab,
	} = props;
	const items: TabsProps['items'] = [
		{
			key: 'overview',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<CableCar size={14} />}
				>
					<Typography.Text className="typography">Overview</Typography.Text>
				</Button>
			),
			children: (
				<Overview
					categories={integrationData.categories}
					assets={integrationData.assets}
					overviewContent={integrationData.overview}
				/>
			),
		},
		{
			key: 'configuration',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<ConfigureIcon />}
				>
					<Typography.Text className="typography">Configure</Typography.Text>
				</Button>
			),
			children: (
				<Configure
					configuration={integrationData.configuration}
					integrationId={integrationId}
				/>
			),
		},
		{
			key: 'dataCollected',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<Group size={14} />}
				>
					<Typography.Text className="typography">Data Collected</Typography.Text>
				</Button>
			),
			children: (
				<DataCollected
					logsData={integrationData.data_collected.logs}
					metricsData={integrationData.data_collected.metrics}
				/>
			),
		},
	];
	return (
		<div className="integration-detail-container">
			<Tabs
				activeKey={activeDetailTab}
				items={items}
				onChange={setActiveDetailTab}
			/>
		</div>
	);
}

export default IntegrationDetailContent;
