import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { defaultStyles, useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { useRef, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { PanelWrapperProps } from './panelWrapper.types';

type TooltipData = {
	label: string;
	key: string;
	value: string;
	color: string;
};

const tooltipStyles = {
	...defaultStyles,
	minWidth: 60,
	backgroundColor: 'rgba(0,0,0,0.9)',
	color: 'white',
	zIndex: 9999,
};

const getLabel = (label: string, query: Query, queryName: string): string => {
	const finalQuery = query.builder.queryData.find(
		(q) => q.queryName === queryName,
	);
	if (finalQuery) {
		if (finalQuery.legend) {
			return finalQuery.legend;
		}
		return label;
	}
	return label;
};

function PiePanelWrapper({
	queryResponse,
	widget,
}: PanelWrapperProps): JSX.Element {
	const [active, setActive] = useState<{
		label: string;
		value: string;
		color: string;
	} | null>(null);

	const {
		tooltipOpen,
		tooltipLeft,
		tooltipTop,
		tooltipData,
		hideTooltip,
		showTooltip,
	} = useTooltip<TooltipData>();

	const { containerRef, TooltipInPortal } = useTooltipInPortal({
		scroll: true,
	});

	const panelData =
		queryResponse.data?.payload?.data.newResult.data.result || [];

	const data = panelData.map((d) =>
		d.series?.map((s) => ({
			label: getLabel(Object.values(s.labels)[0], widget.query, d.queryName),
			value: s.values[0].value,
			color: generateColor(
				getLabel(Object.values(s.labels)[0], widget.query, d.queryName),
				themeColors.chartcolors,
			),
		})),
	);

	const pieChartData: {
		label: string;
		value: string;
		color: string;
	}[] = [].concat(...(data as never[]));

	let size = 0;
	let width = 0;
	let height = 0;

	const chartRef = useRef<HTMLDivElement>(null);
	if (chartRef.current) {
		const { offsetWidth, offsetHeight } = chartRef.current;
		size = Math.min(offsetWidth, offsetHeight);
		width = offsetWidth;
		height = offsetHeight;
	}
	const half = size / 2;

	const getFillColor = (color: string): string => {
		if (active === null) {
			return color;
		}
		return active.color === color ? color : `${color}40`;
	};

	return (
		<>
			<div style={{ height: '90%', width: '100%' }} ref={chartRef}>
				<svg width={width} height={height} ref={containerRef}>
					<Group top={height / 2} left={width / 2}>
						<Pie
							data={pieChartData}
							pieValue={(data: {
								label: string;
								value: string;
								color: string;
							}): number => parseFloat(data.value)}
							outerRadius={({ data }): number => {
								if (!active) return half - 3;
								return data.label === active.label ? half : half - 3;
							}}
							padAngle={0.02}
							width={size}
							height={size}
						>
							{
								// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
								(pie) =>
									pie.arcs.map((arc, index) => {
										const { label } = arc.data;
										const [centroidX, centroidY] = pie.path.centroid(arc);
										const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.6;
										const arcPath = pie.path(arc);
										const arcFill = arc.data.color;
										return (
											<g
												// eslint-disable-next-line react/no-array-index-key
												key={`arc-${label}-${index}`}
												onMouseEnter={(): void => {
													showTooltip({
														tooltipData: {
															label,
															value: arc.data.value,
															color: arc.data.color,
															key: label,
														},
														tooltipTop: centroidY + height / 2,
														tooltipLeft: centroidX + width / 2,
													});
													setActive(arc.data);
												}}
												onMouseLeave={(): void => {
													hideTooltip();
													setActive(null);
												}}
											>
												<path d={arcPath || ''} fill={getFillColor(arcFill)} />
												{hasSpaceForLabel && (
													<text
														x={centroidX}
														y={centroidY}
														dy=".33em"
														fill="#000"
														fontSize={10}
														textAnchor="middle"
														pointerEvents="none"
													>
														{arc.data.label}
													</text>
												)}
											</g>
										);
									})
							}
						</Pie>
					</Group>
				</svg>
				{tooltipOpen && tooltipData && (
					<TooltipInPortal top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
						<div style={{ color: tooltipData.color }}>
							<strong>{tooltipData.key}</strong>
						</div>
						<div>
							<small>{tooltipData.value}</small>
						</div>
					</TooltipInPortal>
				)}
			</div>
			<div
				style={{
					width: '100%',
					height: '40px',
					overflowY: 'scroll',
					display: 'flex',
					gap: '10px',
					justifyContent: 'center',
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				{pieChartData.map((data) => (
					<div
						key={data.label}
						style={{
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							gap: '5px',
						}}
						onMouseEnter={(): void => {
							setActive(data);
						}}
						onMouseLeave={(): void => {
							setActive(null);
						}}
					>
						<div
							style={{
								backgroundColor: getFillColor(data.color),
								width: '10px',
								height: '10px',
								borderRadius: '50%',
							}}
						/>
						{data.label}
					</div>
				))}
			</div>
		</>
	);
}

export default PiePanelWrapper;
