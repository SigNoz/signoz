import './TraceDetailV2.styles.scss';

import { Tabs } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { Compass, TowerControl } from 'lucide-react';

import TraceDetailsV2 from './TraceDetailV2';

export default function TraceDetailsPage(): JSX.Element {
	const items = [
		{
			label: (
				<div className="tab-item">
					<Compass size={16} /> Explorer
				</div>
			),
			key: 'trace-details',
			children: <TraceDetailsV2 />,
		},
		{
			label: (
				<div className="tab-item">
					<TowerControl size={16} /> Views
				</div>
			),
			key: 'saved-views',
			children: <div />,
		},
	];

	return (
		<div className="traces-module-container">
			<Tabs
				items={items}
				animated
				className="trace-module"
				onTabClick={(activeKey): void => {
					if (activeKey === 'saved-views') {
						history.push(ROUTES.TRACES_SAVE_VIEWS);
					}
					if (activeKey === 'trace-details') {
						history.push(ROUTES.TRACES_EXPLORER);
					}
				}}
			/>
			;
		</div>
	);
}
