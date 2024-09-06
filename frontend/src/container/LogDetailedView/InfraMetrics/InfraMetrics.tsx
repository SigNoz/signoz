import './InfraMetrics.styles.scss';

import { ClusterOutlined, ContainerOutlined } from '@ant-design/icons';
import { Radio } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import { useState } from 'react';

import { VIEW_TYPES } from './constants';
import NodeMetrics from './NodeMetrics';
import PodMetrics from './PodMetrics';

interface MetricsDataProps {
	podName: string;
	nodeName: string;
	hostName: string;
	clusterName: string;
}

function InfraMetrics({
	podName,
	nodeName,
	hostName,
	clusterName,
}: MetricsDataProps): JSX.Element {
	const initialView = podName ? VIEW_TYPES.POD : VIEW_TYPES.NODE;
	const [selectedView, setSelectedView] = useState<string>(initialView);

	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

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
						<ClusterOutlined style={{ fontSize: '14px' }} />
						Node
					</div>
				</Radio.Button>
				{podName && (
					<Radio.Button
						className={selectedView === VIEW_TYPES.POD ? 'selected_view tab' : 'tab'}
						value={VIEW_TYPES.POD}
					>
						<div className="view-title">
							<ContainerOutlined style={{ fontSize: '14px' }} />
							Pod
						</div>
					</Radio.Button>
				)}
			</Radio.Group>
			{selectedView === VIEW_TYPES.NODE && (
				<NodeMetrics
					nodeName={nodeName}
					clusterName={clusterName}
					hostName={hostName}
				/>
			)}
			{selectedView === VIEW_TYPES.POD && podName && (
				<PodMetrics podName={podName} clusterName={clusterName} />
			)}
		</div>
	);
}

export default InfraMetrics;
