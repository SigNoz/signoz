import './InfraMetrics.styles.scss';

import { Empty } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { History, Table } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { VIEW_TYPES } from './constants';
import NodeMetrics from './NodeMetrics';
import PodMetrics from './PodMetrics';

interface MetricsDataProps {
	podName: string;
	nodeName: string;
	hostName: string;
	clusterName: string;
	timestamp: string;
	dataSource: DataSource.LOGS | DataSource.TRACES;
}

function InfraMetrics({
	podName,
	nodeName,
	hostName,
	clusterName,
	timestamp,
	dataSource = DataSource.LOGS,
}: MetricsDataProps): JSX.Element {
	const [selectedView, setSelectedView] = useState<string>(() =>
		podName ? VIEW_TYPES.POD : VIEW_TYPES.NODE,
	);

	const viewOptions = useMemo(() => {
		const options = [
			{
				label: (
					<div className="view-title">
						<Table size={14} />
						Node
					</div>
				),
				value: VIEW_TYPES.NODE,
			},
		];

		if (podName) {
			options.push({
				label: (
					<div className="view-title">
						<History size={14} />
						Pod
					</div>
				),
				value: VIEW_TYPES.POD,
			});
		}

		return options;
	}, [podName]);

	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	if (!podName && !nodeName && !hostName) {
		const emptyStateDescription =
			dataSource === DataSource.TRACES
				? 'No data available. Please select a span containing a pod, node, or host attributes to view metrics.'
				: 'No data available. Please select a valid log line containing a pod, node, or host attributes to view metrics.';

		return (
			<div className="empty-container">
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description={emptyStateDescription}
				/>
			</div>
		);
	}

	return (
		<div className="infra-metrics-container">
			<SignozRadioGroup
				value={selectedView}
				onChange={handleModeChange}
				className="views-tabs"
				options={viewOptions}
			/>
			{/* TODO(Rahul): Make a common config driven component for this and other infra metrics components */}
			{selectedView === VIEW_TYPES.NODE && (
				<NodeMetrics
					nodeName={nodeName}
					clusterName={clusterName}
					hostName={hostName}
					timestamp={timestamp}
				/>
			)}
			{selectedView === VIEW_TYPES.POD && podName && (
				<PodMetrics
					podName={podName}
					clusterName={clusterName}
					timestamp={timestamp}
				/>
			)}
		</div>
	);
}

export default InfraMetrics;
