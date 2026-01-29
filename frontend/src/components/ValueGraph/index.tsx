import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';

import { getBackgroundColorAndThresholdCheck } from './utils';

import './ValueGraph.styles.scss';

function Unit({
	type,
	unit,
	threshold,
	fontSize,
}: {
	type: 'prefix' | 'suffix';
	unit: string;
	threshold: ThresholdProps;
	fontSize: string;
}): JSX.Element {
	return (
		<Typography.Text
			className="value-graph-unit"
			data-testid={`value-graph-${type}-unit`}
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
	);
}

function ValueGraph({
	value,
	rawValue,
	thresholds,
}: ValueGraphProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);
	const containerRef = useRef<HTMLDivElement>(null);
	const [fontSize, setFontSize] = useState('2.5vw');

	const { numericValue, prefixUnit, suffixUnit } = useMemo(() => {
		const matches = value.match(
			/^([^\d.]*)?([\d.]+(?:[eE][+-]?[\d]+)?[KMB]?)([^\d.]*)?$/,
		);
		return {
			numericValue: matches?.[2] || value,
			prefixUnit: matches?.[1]?.trim() || '',
			suffixUnit: matches?.[3]?.trim() || '',
		};
	}, [value]);

	// Adjust font size based on container size
	useEffect(() => {
		const updateFontSize = (): void => {
			if (!containerRef.current) {
				return;
			}

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
				{prefixUnit && (
					<Unit
						type="prefix"
						unit={prefixUnit}
						threshold={threshold}
						fontSize={fontSize}
					/>
				)}
				<Typography.Text
					className="value-graph-text"
					data-testid="value-graph-text"
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
				{suffixUnit && (
					<Unit
						type="suffix"
						unit={suffixUnit}
						threshold={threshold}
						fontSize={fontSize}
					/>
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
