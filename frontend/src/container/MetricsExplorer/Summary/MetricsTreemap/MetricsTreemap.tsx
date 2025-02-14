import { Group } from '@visx/group';
import { Treemap } from '@visx/hierarchy';
import { Empty, Skeleton, Tooltip } from 'antd';
import { stratify, treemapBinary } from 'd3-hierarchy';
import { useMemo } from 'react';
import { useWindowSize } from 'react-use';

import {
	TREEMAP_HEIGHT,
	TREEMAP_MARGINS,
	TREEMAP_SQUARE_PADDING,
} from '../constants';
import { TreemapProps, TreemapTile } from '../types';
import {
	getTreemapTileStyle,
	getTreemapTileTextStyle,
	transformTreemapData,
} from '../utils';

function MetricsTreemap({
	viewType,
	data,
	isLoading,
}: TreemapProps): JSX.Element {
	const { width: windowWidth } = useWindowSize();

	const treemapWidth = useMemo(() => windowWidth - 100, [windowWidth]);

	const treemapData = useMemo(() => {
		const extracedTreemapData =
			(viewType === 'cardinality'
				? data?.data?.heatmap?.cardinality
				: data?.data?.heatmap?.datapoints) || [];
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

	if (!transformTreemapData.length) {
		return (
			<Empty
				description="No metrics found"
				style={{ width: treemapWidth, height: TREEMAP_HEIGHT, paddingTop: 30 }}
			/>
		);
	}

	return (
		<div className="metrics-treemap">
			<svg width={treemapWidth} height={TREEMAP_HEIGHT}>
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
									return (
										<Group
											// eslint-disable-next-line react/no-array-index-key
											key={`node-${i}`}
											top={node.y0 + TREEMAP_MARGINS.TOP}
											left={node.x0 + TREEMAP_MARGINS.LEFT}
										>
											{node.depth > 0 && (
												<Tooltip title={node.data.id} placement="top">
													<foreignObject
														width={nodeWidth}
														height={nodeHeight}
														style={getTreemapTileStyle()}
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
