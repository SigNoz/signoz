import './ValueGraph.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { useTranslation } from 'react-i18next';

import { getBackgroundColorAndThresholdCheck } from './utils';

function ValueGraph({
	value,
	rawValue,
	thresholds,
}: ValueGraphProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);

	const {
		threshold,
		isConflictingThresholds,
	} = getBackgroundColorAndThresholdCheck(thresholds, rawValue);

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
					<Tooltip title={t('this_value_satisfies_multiple_thresholds')}>
						<ExclamationCircleFilled
							className="value-graph-icon"
							data-testid="conflicting-thresholds"
						/>
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
