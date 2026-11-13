import { Button, Tabs, TabsProps } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import { CableCar, Group } from '@signozhq/icons';
import { IntegrationDetailedProps } from 'types/api/integrations/types';

import Configure from './IntegrationDetailContentTabs/Configure';
import DataCollected from './IntegrationDetailContentTabs/DataCollected';
import Overview from './IntegrationDetailContentTabs/Overview';

import './IntegrationDetailPage.styles.scss';

interface IntegrationDetailContentProps {
	activeDetailTab: string;
	integrationData: IntegrationDetailedProps;
	integrationId: string;
	setActiveDetailTab: React.Dispatch<React.SetStateAction<string | null>>;
}

function IntegrationDetailContent(
	props: IntegrationDetailContentProps,
): JSX.Element {
	const { activeDetailTab, integrationData, integrationId, setActiveDetailTab } =
		props;
	const items: TabsProps['items'] = [
		{
			key: 'overview',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<CableCar size={14} />}
				>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="main"
						as="span"
						textOverflow="wrap"
					>
						Overview
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="main"
						as="span"
						textOverflow="wrap"
					>
						Configure
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="main"
						as="span"
						textOverflow="wrap"
					>
						Data Collected
					</Typography>
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
