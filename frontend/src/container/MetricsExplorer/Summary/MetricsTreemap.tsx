import { Group } from '@visx/group';
import { Treemap } from '@visx/hierarchy';
import { Empty, Skeleton, Tooltip, Typography } from 'antd';
import { stratify, treemapBinary } from 'd3-hierarchy';
import { useMemo } from 'react';
import { useWindowSize } from 'react-use';

import {
	TREEMAP_HEIGHT,
	TREEMAP_MARGINS,
	TREEMAP_SQUARE_PADDING,
} from './constants';
import { MetricsTreemapProps, TreemapTile, TreemapViewType } from './types';
import {
	getTreemapTileStyle,
	getTreemapTileTextStyle,
	transformTreemapData,
} from './utils';

function MetricsTreemap({
	viewType,
	data,
	isLoading,
	openMetricDetails,
}: MetricsTreemapProps): JSX.Element {
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
			(viewType === TreemapViewType.TIMESERIES
				? data?.data?.[TreemapViewType.TIMESERIES]
				: data?.data?.[TreemapViewType.SAMPLES]) || [];
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
			<Skeleton style={{ width: treemapWidth, height: TREEMAP_HEIGHT }} active />
		);
	}

	if (
		!data ||
		!data.data ||
		data?.status === 'error' ||
		(data?.status === 'success' && !data?.data?.[viewType])
	) {
		return (
			<Empty
				description="No metrics found"
				style={{ width: treemapWidth, height: TREEMAP_HEIGHT, paddingTop: 30 }}
			/>
		);
	}

	return (
		<div className="metrics-treemap-container">
			<Typography.Title level={4} className="metrics-treemap-title">
				Proportion View
				<Tooltip
					title="The treemap displays the proportion of samples/timeseries in the selected time range. Each tile represents a unique metric, and its size indicates the percentage of samples/timeseries it contributes to the total."
					placement="right"
				>
					<span style={{ marginLeft: '2px' }}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 9C11.4477 9 11 9.44772 11 10V16C11 16.5523 11.4477 17 12 17C12.5523 17 13 16.5523 13 16V10C13 9.44772 12.5523 9 12 9ZM12 8C12.5523 8 13 7.55228 13 7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7C11 7.55228 11.4477 8 12 8Z"
								fill="currentColor"
							/>
						</svg>
					</span>
				</Tooltip>
			</Typography.Title>
			<svg
				width={treemapWidth}
				height={TREEMAP_HEIGHT}
				className="metrics-treemap"
			>
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
														style={getTreemapTileStyle(node.data)}
														onClick={(): void => openMetricDetails(node.data.id)}
													>
														<div style={getTreemapTileTextStyle()}>
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
		</div>
	);
}

export default MetricsTreemap;
