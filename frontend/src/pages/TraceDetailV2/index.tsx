import { Tabs } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { Compass, Cone, TowerControl } from 'lucide-react';

import TraceDetailsV3 from '../TraceDetailsV3';

import './TraceDetailV2.styles.scss';

function NewTraceDetail(props: any): JSX.Element {
	const { items } = props;
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
					if (activeKey === 'funnels') {
						logEvent('Trace Funnels: visited from trace details page', {});
						history.push(ROUTES.TRACES_FUNNELS);
					}
				}}
			/>
		</div>
	);
}

export default function TraceDetailsPage(): JSX.Element {
	const items = [
		{
			label: (
				<div className="tab-item">
					<Compass size={16} /> Explorer
				</div>
			),
			key: 'trace-details',
			children: <TraceDetailsV3 />,
		},
		{
			label: (
				<div className="tab-item">
					<Cone className="funnel-icon" size={16} /> Funnels
				</div>
			),
			key: 'funnels',
			children: <div />,
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

	return <NewTraceDetail items={items} />;
}
