import './ValueGraph.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getBackgroundColorAndThresholdCheck } from './utils';

function ValueGraph({
	value,
	rawValue,
	thresholds,
}: ValueGraphProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);
	const containerRef = useRef<HTMLDivElement>(null);
	const [fontSize, setFontSize] = useState('2.5vw');

	// Parse value to separate number and unit (assuming unit is at the end)
	const matches = value.match(/([\d.]+[KMB]?)(.*)$/);
	const numericValue = matches?.[1] || value;
	const unit = matches?.[2]?.trim() || '';

	// Adjust font size based on container size
	useEffect(() => {
		const updateFontSize = (): void => {
			if (!containerRef.current) return;

			const { width, height } = containerRef.current.getBoundingClientRect();
			const minDimension = Math.min(width, height);
			// Responsive font sizing based on container size
			const newSize = Math.max(Math.min(minDimension / 5, 60), 16);
			setFontSize(`${newSize}px`);
		};

		// Initial sizing
		updateFontSize();

		// Setup resize observer
		const resizeObserver = new ResizeObserver(updateFontSize);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return (): void => {
			resizeObserver.disconnect();
		};
	}, []);

	const {
		threshold,
		isConflictingThresholds,
	} = getBackgroundColorAndThresholdCheck(thresholds, rawValue);

	return (
		<div
			ref={containerRef}
			className="value-graph-container"
			style={{
				backgroundColor:
					threshold.thresholdFormat === 'Background'
						? threshold.thresholdColor
						: undefined,
			}}
		>
			<div className="value-text-container">
				<Typography.Text
					className="value-graph-text"
					style={{
						color:
							threshold.thresholdFormat === 'Text'
								? threshold.thresholdColor
								: undefined,
						fontSize,
					}}
				>
					{numericValue}
				</Typography.Text>
				{unit && (
					<Typography.Text
						className="value-graph-unit"
						style={{
							color:
								threshold.thresholdFormat === 'Text'
									? threshold.thresholdColor
									: undefined,
							fontSize: `calc(${fontSize} * 0.7)`,
						}}
					>
						{unit}
					</Typography.Text>
				)}
			</div>
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
