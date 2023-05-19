/* eslint-disable  */
//@ts-nocheck
import { useIsDarkMode } from 'hooks/useDarkMode';
import { memo, useState } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { isEqual } from 'lodash-es';

import {
	getGraphData,
	getNodePositions,
	getTooltip,
	transformLabel,
} from './utils';

function ServiceMap({ fgRef, serviceMap }: any): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [firstRenderDone, setFirstRenderDone] = useState(false);
	const [capturedNodePosition, setCapturedNodePosition] = useState({});
	const { nodes, links } = getGraphData(serviceMap, isDarkMode);
	const graphData = { nodes, links };

	const onEngineStopHandler = () => {
		if (!firstRenderDone) {
			setFirstRenderDone(true);
			setCapturedNodePosition(getNodePositions(nodes));
		}
	};

	return (
		<ForceGraph2D
			ref={fgRef}
			warmupTicks={firstRenderDone ? 100 : 0}
			cooldownTicks={firstRenderDone ? 0 : 100}
			onEngineStop={onEngineStopHandler}
			graphData={graphData}
			linkLabel={getTooltip}
			linkAutoColorBy={(d) => d.target}
			linkDirectionalParticles="value"
			linkDirectionalParticleSpeed={(d) => d.value}
			nodeCanvasObject={(node, ctx) => {
				if (firstRenderDone && Object.keys(capturedNodePosition).length) {
					node.fx = capturedNodePosition[node.id].x;
					node.fy = capturedNodePosition[node.id].y;
				}

				const label = transformLabel(node.id);
				const { fontSize } = node;
				ctx.font = `${fontSize}px Roboto`;
				const { width } = node;

				ctx.fillStyle = node.color;
				ctx.beginPath();
				ctx.arc(node.fx || node.x, node.fy || node.y, width, 0, 2 * Math.PI, false);
				ctx.fill();
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
				ctx.fillText(label, node.fx || node.x, node.fy || node.y);
			}}
			onLinkHover={(node) => {
				const tooltip = document.querySelector('.graph-tooltip');
				if (tooltip && node) {
					tooltip.innerHTML = getTooltip(node);
				}
			}}
			nodePointerAreaPaint={(node, color, ctx) => {
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
				ctx.fill();
			}}
		/>
	);
}

export default memo(ServiceMap, (prevProps, nextProps) => {
	return isEqual(prevProps, nextProps);
});
