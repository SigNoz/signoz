import { memo, MutableRefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import ForceGraph2D, {
	ForceGraphMethods,
	LinkObject,
	NodeObject,
} from 'react-force-graph-2d';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { NODE_FONT_SIZE } from './constants';
import type {
	ServiceMapDependency,
	ServiceMapGraph,
	ServiceMapLink,
	ServiceMapNode,
} from './types';
import { buildGraph, getNodePositions } from './utils/buildGraph';
import {
	getLinkTooltip,
	getNodeColor,
	getNodeRadius,
	transformLabel,
} from './utils/graphStyle';

type GraphNode = NodeObject<ServiceMapNode>;
type GraphLink = LinkObject<ServiceMapNode, ServiceMapLink>;

export type ServiceMapGraphRef = MutableRefObject<
	ForceGraphMethods<GraphNode, GraphLink> | undefined
>;

interface MapProps {
	fgRef: ServiceMapGraphRef;
	dependencies: ServiceMapDependency[];
}

function ServiceMapCanvas({ fgRef, dependencies }: MapProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const zoomLevelRef = useRef(1);
	const previousGraphRef = useRef<ServiceMapGraph>();

	const graphData = useMemo(
		() =>
			buildGraph(
				dependencies,
				getNodePositions(previousGraphRef.current?.nodes ?? []),
			),
		[dependencies],
	);

	useEffect(() => {
		previousGraphRef.current = graphData;
	}, [graphData]);

	const highestCallRate = useMemo(
		() => Math.max(0, ...graphData.nodes.map((node) => node.callRate)),
		[graphData],
	);

	const paintNode = useCallback(
		(node: GraphNode, ctx: CanvasRenderingContext2D): void => {
			const radius = getNodeRadius(node.callRate, highestCallRate);
			const fontSize = (NODE_FONT_SIZE * 3) / zoomLevelRef.current;

			ctx.fillStyle = getNodeColor(node, isDarkMode);
			ctx.beginPath();
			ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.font = `${fontSize}px Roboto`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
			ctx.fillText(
				transformLabel(node.id, zoomLevelRef.current),
				node.x ?? 0,
				node.y ?? 0,
			);
		},
		[highestCallRate, isDarkMode],
	);

	const paintNodePointerArea = useCallback(
		(node: GraphNode, color: string, ctx: CanvasRenderingContext2D): void => {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(
				node.x ?? 0,
				node.y ?? 0,
				getNodeRadius(node.callRate, highestCallRate),
				0,
				2 * Math.PI,
				false,
			);
			ctx.fill();
		},
		[highestCallRate],
	);

	return (
		<ForceGraph2D<ServiceMapNode, ServiceMapLink>
			ref={fgRef}
			cooldownTicks={100}
			graphData={graphData}
			linkLabel={getLinkTooltip}
			linkAutoColorBy={(link): string => String(link.target)}
			nodeCanvasObject={paintNode}
			nodePointerAreaPaint={paintNodePointerArea}
			onZoom={({ k }): void => {
				zoomLevelRef.current = k;
			}}
		/>
	);
}

export default memo(ServiceMapCanvas);
