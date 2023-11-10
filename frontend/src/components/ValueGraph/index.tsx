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
		threshold,
		isConflictingThresholds,
	} = getBackgroundColorAndThresholdCheck(thresholds, rawValue);

	console.log({ thresholds });
	console.log({ threshold });

	return (
		<div
			className="value-graph-container"
			style={{
				backgroundColor:
					threshold.thresholdFormat === 'Background'
						? threshold.thresholdColor
						: undefined,
			}}
		>
			<Typography.Text
				className="value-graph-text"
				style={{
					color:
						threshold.thresholdFormat === 'Text'
							? threshold.thresholdColor
							: undefined,
				}}
			>
				{value}
			</Typography.Text>
			{isConflictingThresholds && (
				<div
					className={
						threshold.thresholdFormat === 'Background'
							? 'value-graph-bgconflict'
							: 'value-graph-textconflict'
					}
				>
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
