import './TraceDetailV2.styles.scss';

import { Button, Tabs } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { Compass, Cone, TowerControl, Undo } from 'lucide-react';
import TraceDetail from 'pages/TraceDetail';
import { useCallback, useState } from 'react';

import TraceDetailsV2 from './TraceDetailV2';

interface INewTraceDetailProps {
	items: {
		label: JSX.Element;
		key: string;
		children: JSX.Element;
	}[];
	handleOldTraceDetails: () => void;
}

function NewTraceDetail(props: INewTraceDetailProps): JSX.Element {
	const { items, handleOldTraceDetails } = props;
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
				tabBarExtraContent={
					<Button
						type="text"
						onClick={handleOldTraceDetails}
						className="old-switch"
						icon={<Undo size={14} />}
					>
						Old Trace Details
					</Button>
				}
			/>
		</div>
	);
}

export default function TraceDetailsPage(): JSX.Element {
	const [showOldTraceDetails, setShowOldTraceDetails] = useState<boolean>(false);

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
		...(process.env.NODE_ENV === 'development'
			? [
					{
						label: (
							<div className="tab-item">
								<Cone className="funnel-icon" size={16} /> Funnels
							</div>
						),
						key: 'funnels',
						children: <div />,
					},
			  ]
			: []),
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
	const handleOldTraceDetails = useCallback(() => {
		setShowOldTraceDetails(true);
	}, []);

	return showOldTraceDetails ? (
		<TraceDetail />
	) : (
		<NewTraceDetail items={items} handleOldTraceDetails={handleOldTraceDetails} />
	);
}
