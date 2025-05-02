import './InfraMetrics.styles.scss';

import { Empty, Radio } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import { History, Table } from 'lucide-react';
import { useState } from 'react';

import { VIEW_TYPES } from './constants';
import NodeMetrics from './NodeMetrics';
import PodMetrics from './PodMetrics';

interface MetricsDataProps {
	podName: string;
	nodeName: string;
	hostName: string;
	clusterName: string;
	logLineTimestamp: string;
}

function InfraMetrics({
	podName,
	nodeName,
	hostName,
	clusterName,
	logLineTimestamp,
}: MetricsDataProps): JSX.Element {
	const [selectedView, setSelectedView] = useState<string>(() =>
		podName ? VIEW_TYPES.POD : VIEW_TYPES.NODE,
	);

	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	if (!podName && !nodeName && !hostName) {
		return (
			<div className="empty-container">
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description="No data available. Please select a valid log line containing a pod, node, or host attributes to view metrics."
				/>
			</div>
		);
	}

	return (
		<div className="infra-metrics-container">
			<Radio.Group
				className="views-tabs"
				onChange={handleModeChange}
				value={selectedView}
			>
				<Radio.Button
					className={selectedView === VIEW_TYPES.NODE ? 'selected_view tab' : 'tab'}
					value={VIEW_TYPES.NODE}
				>
					<div className="view-title">
						<Table size={14} />
						Node
					</div>
				</Radio.Button>
				{podName && (
					<Radio.Button
						className={selectedView === VIEW_TYPES.POD ? 'selected_view tab' : 'tab'}
						value={VIEW_TYPES.POD}
					>
						<div className="view-title">
							<History size={14} />
							Pod
						</div>
					</Radio.Button>
				)}
			</Radio.Group>
			{/* TODO(Rahul): Make a common config driven component for this and other infra metrics components */}
			{selectedView === VIEW_TYPES.NODE && (
				<NodeMetrics
					nodeName={nodeName}
					clusterName={clusterName}
					hostName={hostName}
					logLineTimestamp={logLineTimestamp}
				/>
			)}
			{selectedView === VIEW_TYPES.POD && podName && (
				<PodMetrics
					podName={podName}
					clusterName={clusterName}
					logLineTimestamp={logLineTimestamp}
				/>
			)}
		</div>
	);
}

export default InfraMetrics;
