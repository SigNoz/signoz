import './IntegrationDetailPage.styles.scss';

import { Button, Tabs, TabsProps, Typography } from 'antd';
import { Drum, Hammer, Table2 } from 'lucide-react';

import Configure from './IntegrationDetailContentTabs/Configure';
import DataCollected from './IntegrationDetailContentTabs/DataCollected';
import Overview from './IntegrationDetailContentTabs/Overview';

function IntegrationDetailContent(): JSX.Element {
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
			children: <Overview />,
		},
		{
			key: 'configuration',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<Hammer size={14} />}
				>
					<Typography.Text className="typography">Configuration</Typography.Text>
				</Button>
			),
			children: <Configure />,
		},
		{
			key: 'dataCollected',
			label: (
				<Button
					type="text"
					className="integration-tab-btns"
					icon={<Table2 size={14} />}
				>
					<Typography.Text className="typography">Data Collected</Typography.Text>
				</Button>
			),
			children: <DataCollected />,
		},
	];
	return (
		<div className="integration-detail-container">
			<Tabs defaultActiveKey="1" items={items} />
		</div>
	);
}

export default IntegrationDetailContent;
