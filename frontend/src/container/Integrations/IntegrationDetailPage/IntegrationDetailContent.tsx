import { Tabs, TabItemProps } from '@signozhq/ui/tabs';
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
	const items: TabItemProps[] = [
		{
			key: 'overview',
			label: 'Overview',
			prefixIcon: <CableCar size={14} />,
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
			label: 'Configure',
			prefixIcon: <ConfigureIcon />,
			children: (
				<Configure
					configuration={integrationData.configuration}
					integrationId={integrationId}
				/>
			),
		},
		{
			key: 'dataCollected',
			label: 'Data Collected',
			prefixIcon: <Group size={14} />,
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
			<Tabs value={activeDetailTab} items={items} onChange={setActiveDetailTab} />
		</div>
	);
}

export default IntegrationDetailContent;
