import { useMemo } from 'react';
import { useWindowSize } from 'react-use';
import { Group } from '@visx/group';
import { Treemap } from '@visx/hierarchy';
import { Empty, Select, Skeleton, Tooltip, Typography } from 'antd';
import { MetricsexplorertypesTreemapModeDTO } from 'api/generated/services/sigNoz.schemas';
import { stratify, treemapBinary } from 'd3-hierarchy';
import { Info } from 'lucide-react';

import {
	TREEMAP_HEIGHT,
	TREEMAP_MARGINS,
	TREEMAP_SQUARE_PADDING,
	TREEMAP_VIEW_OPTIONS,
} from './constants';
import { MetricsTreemapProps, TreemapContentProps, TreemapTile } from './types';
import {
	getTreemapTileStyle,
	getTreemapTileTextStyle,
	transformTreemapData,
} from './utils';

function TreemapContent({
	isLoading,
	isError,
	data,
	viewType,
	openMetricDetails,
}: TreemapContentProps): JSX.Element {
	const { width: windowWidth } = useWindowSize();

	const treemapWidth = useMemo(
		() =>
			Math.max(
				windowWidth - TREEMAP_MARGINS.LEFT - TREEMAP_MARGINS.RIGHT - 70,
				300,
			),
		[windowWidth],
	);

	const treemapData = useMemo(() => {
		const extracedTreemapData =
			(viewType === MetricsexplorertypesTreemapModeDTO.timeseries
				? data?.timeseries
				: data?.samples) || [];
		return transformTreemapData(extracedTreemapData, viewType);
	}, [data, viewType]);

	const transformedTreemapData = stratify<TreemapTile>()
		.id((d) => d.id)
		.parentId((d) => d.parent)(treemapData)
		.sum((d) => d.size ?? 0);

	const xMax = treemapWidth - TREEMAP_MARGINS.LEFT - TREEMAP_MARGINS.RIGHT;
	const yMax = TREEMAP_HEIGHT - TREEMAP_MARGINS.TOP - TREEMAP_MARGINS.BOTTOM;

	if (isLoading) {
		return (
			<div data-testid="metrics-treemap-loading-state">
				<Skeleton style={{ width: treemapWidth, height: TREEMAP_HEIGHT }} active />
			</div>
		);
	}

	if (isError) {
		return (
			<Empty
				description="Error fetching metrics. If the problem persists, please contact support."
				data-testid="metrics-treemap-error-state"
				style={{ width: treemapWidth, height: TREEMAP_HEIGHT, paddingTop: 30 }}
			/>
		);
	}

	if (!data || !data?.[viewType]?.length) {
		return (
			<Empty
				description="No metrics found"
				data-testid="metrics-treemap-empty-state"
				style={{ width: treemapWidth, height: TREEMAP_HEIGHT, paddingTop: 30 }}
			/>
		);
	}

	return (
		<svg width={treemapWidth} height={TREEMAP_HEIGHT} className="metrics-treemap">
			<rect
				width={treemapWidth}
				height={TREEMAP_HEIGHT}
				rx={14}
				fill="transparent"
			/>
			<Treemap<TreemapTile>
				top={TREEMAP_MARGINS.TOP}
				root={transformedTreemapData}
				size={[xMax, yMax]}
				tile={treemapBinary}
				round
			>
				{(treemap): JSX.Element => (
					<Group>
						{treemap
							.descendants()
							.reverse()
							.map((node, i) => {
								const nodeWidth = node.x1 - node.x0 - TREEMAP_SQUARE_PADDING;
								const nodeHeight = node.y1 - node.y0 - TREEMAP_SQUARE_PADDING;
								if (nodeWidth < 0 || nodeHeight < 0) {
									return null;
								}
								return (
									<Group
										// eslint-disable-next-line react/no-array-index-key
										key={node.data.id || `node-${i}`}
										top={node.y0 + TREEMAP_MARGINS.TOP}
										left={node.x0 + TREEMAP_MARGINS.LEFT}
									>
										{node.depth > 0 && (
											<Tooltip
												title={`${node.data.id}: ${node.data.displayValue}%`}
												placement="top"
											>
												<foreignObject
													width={nodeWidth}
													height={nodeHeight}
													onClick={(): void => openMetricDetails(node.data.id, 'treemap')}
												>
													<div
														style={{
															...getTreemapTileStyle(node.data),
															...getTreemapTileTextStyle(),
														}}
													>
														{`${node.data.displayValue}%`}
													</div>
												</foreignObject>
											</Tooltip>
										)}
									</Group>
								);
							})}
					</Group>
				)}
			</Treemap>
		</svg>
	);
}

function MetricsTreemap({
	viewType,
	data,
	isLoading,
	isError,
	openMetricDetails,
	setHeatmapView,
}: MetricsTreemapProps): JSX.Element {
	return (
		<div
			className="metrics-treemap-container"
			data-testid="metrics-treemap-container"
		>
			<div className="metrics-treemap-title">
				<div className="metrics-treemap-title-left">
					<Typography.Title level={4}>Proportion View</Typography.Title>
					<Tooltip
						title="The treemap displays the proportion of samples/timeseries in the selected time range. Each tile represents a unique metric, and its size indicates the percentage of samples/timeseries it contributes to the total."
						placement="right"
					>
						<Info size={16} />
					</Tooltip>
				</div>
				<Select
					options={TREEMAP_VIEW_OPTIONS}
					value={viewType}
					onChange={setHeatmapView}
					disabled={isLoading}
				/>
			</div>
			<TreemapContent
				isLoading={isLoading}
				isError={isError}
				data={data}
				viewType={viewType}
				openMetricDetails={openMetricDetails}
			/>
		</div>
	);
}

export default MetricsTreemap;
