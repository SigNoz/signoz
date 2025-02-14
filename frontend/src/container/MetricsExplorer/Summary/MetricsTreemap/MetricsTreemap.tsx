import { Color } from '@signozhq/design-tokens';
import { Group } from '@visx/group';
import { Treemap } from '@visx/hierarchy';
import { Skeleton } from 'antd';
import { stratify, treemapBinary } from 'd3-hierarchy';
import { useMemo } from 'react';
import { useWindowSize } from 'react-use';

import { TREEMAP_HEIGHT, TREEMAP_MARGINS } from '../constants';
import { TreemapProps, TreemapTile } from '../types';
import { transformTreemapData } from '../utils';

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
		return <Skeleton />;
	}

	return (
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
								const nodeWidth = node.x1 - node.x0;
								const nodeHeight = node.y1 - node.y0;
								return (
									<Group
										// eslint-disable-next-line react/no-array-index-key
										key={`node-${i}`}
										top={node.y0 + TREEMAP_MARGINS.TOP}
										left={node.x0 + TREEMAP_MARGINS.LEFT}
									>
										{node.depth > 0 && (
											<Group>
												<rect
													width={nodeWidth}
													height={nodeHeight}
													fill={Color.BG_AMBER_500}
													stroke={Color.TEXT_SLATE_500}
													strokeWidth={6}
													radius={4}
												/>
												<text x={nodeWidth / 2} y={nodeHeight / 2} textAnchor="middle">
													{`${node.data.displayValue}%`}
												</text>
											</Group>
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

export default MetricsTreemap;
