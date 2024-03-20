import './IntegrationDetailPage.styles.scss';

import { Button, Tabs, TabsProps, Typography } from 'antd';
import { Drum } from 'lucide-react';
import { IntegrationDetailedProps } from 'types/api/integrations/types';

import Configure from './IntegrationDetailContentTabs/Configure';
import DataCollected from './IntegrationDetailContentTabs/DataCollected';
import Overview from './IntegrationDetailContentTabs/Overview';

interface IntegrationDetailContentProps {
	activeDetailTab: string;
	integrationData: IntegrationDetailedProps;
}

function IntegrationDetailContent(
	props: IntegrationDetailContentProps,
): JSX.Element {
	const { activeDetailTab, integrationData } = props;
	const items: TabsProps['items'] = [
		{
			key: 'overview',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<Drum size={14} />}
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
					icon={
						<img
							src="/Icons/configure.svg"
							alt="configure-tab"
							className="configure-icon"
						/>
					}
				>
					<Typography.Text className="typography">Configure</Typography.Text>
				</Button>
			),
			children: <Configure configuration={integrationData.configuration} />,
		},
		{
			key: 'dataCollected',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<img src="/Icons/group.svg" alt="data-tab" className="group-icon" />}
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
			<Tabs defaultActiveKey={activeDetailTab} items={items} />
		</div>
	);
}

export default IntegrationDetailContent;
