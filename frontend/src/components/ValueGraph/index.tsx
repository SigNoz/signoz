import './ValueGraph.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';

import { getBackgroundColorAndThresholdCheck } from './utils';

function ValueGraph({
	value,
	rawValue,
	thresholds,
}: ValueGraphProps): JSX.Element {
	const {
		bgColor,
		isConflictingThresholds,
	} = getBackgroundColorAndThresholdCheck(thresholds, rawValue);

	return (
		<div className="value-graph-container" style={{ backgroundColor: bgColor }}>
			<Typography.Text className="value-graph-text">{value}</Typography.Text>
			{isConflictingThresholds && (
				<div className="value-graph-conflict">
					<Tooltip title="This value satisfies multiple thresholds">
						<ExclamationCircleFilled style={{ color: '#E89A3C' }} />
					</Tooltip>
				</div>
			)}
		</div>
	);
}

interface ValueGraphProps {
	value: string;
	rawValue: number;
	thresholds: ThresholdProps[];
}

export default ValueGraph;
