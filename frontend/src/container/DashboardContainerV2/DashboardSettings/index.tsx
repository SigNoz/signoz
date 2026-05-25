import { Button, Empty, Tabs } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Braces, Globe, Table } from '@signozhq/icons';

import '../../DashboardContainer/DashboardSettings/DashboardSettingsContent.styles.scss';

import GeneralDashboardSettingsV2 from './General';
import VariablesSettingsV2 from './Variables';
import type { V2Dashboard } from '../utils';

interface Props {
	dashboard: V2Dashboard | undefined;
	onRefetch: () => void;
}

function Placeholder({ message }: { message: string }): JSX.Element {
	return (
		<div style={{ padding: 24 }}>
			<Empty
				image={Empty.PRESENTED_IMAGE_SIMPLE}
				description={<Typography.Text>{message}</Typography.Text>}
			/>
		</div>
	);
}

function DashboardSettingsV2({ dashboard, onRefetch }: Props): JSX.Element {
	const items = [
		{
			label: (
				<Button type="text" icon={<Table size={14} />}>
					General
				</Button>
			),
			key: 'general',
			children: (
				<GeneralDashboardSettingsV2
					dashboard={dashboard}
					onRefetch={onRefetch}
				/>
			),
		},
		{
			label: (
				<Button type="text" icon={<Braces size={14} />}>
					Variables
				</Button>
			),
			key: 'variables',
			children: (
				<VariablesSettingsV2 dashboard={dashboard} onRefetch={onRefetch} />
			),
		},
		{
			label: (
				<Button type="text" icon={<Globe size={14} />}>
					Publish
				</Button>
			),
			key: 'public-dashboard',
			children: (
				<Placeholder message="V2 public dashboard publishing coming next." />
			),
		},
	];

	return <Tabs items={items} />;
}

export default DashboardSettingsV2;
