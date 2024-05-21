/* eslint-disable  */
//@ts-nocheck
import { useIsDarkMode } from 'hooks/useDarkMode';
import { memo } from 'react';
import { ForceGraph2D } from 'react-force-graph';

import { getGraphData, getTooltip, transformLabel } from './utils';

function ServiceMap({ fgRef, serviceMap }: any): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const { nodes, links } = getGraphData(serviceMap, isDarkMode);

	const graphData = { nodes, links };

	let zoomLevel = 1;

	return (
		<ForceGraph2D
			ref={fgRef}
			cooldownTicks={100}
			graphData={graphData}
			linkLabel={getTooltip}
			linkAutoColorBy={(d) => d.target}
			linkDirectionalParticles="value"
			linkDirectionalParticleSpeed={(d) => d.value}
			nodeCanvasObject={(node, ctx) => {
				const label = transformLabel(node.id, zoomLevel);
				let { fontSize } = node;
				fontSize = (fontSize * 3) / zoomLevel;
				ctx.font = `${fontSize}px Roboto`;
				const { width } = node;

				ctx.fillStyle = node.color;
				ctx.beginPath();
				ctx.arc(node.x, node.y, width, 0, 2 * Math.PI, false);
				ctx.fill();
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
				ctx.fillText(label, node.x, node.y);
			}}
			onLinkHover={(node) => {
				const tooltip = document.querySelector('.graph-tooltip');
				if (tooltip && node) {
					tooltip.innerHTML = getTooltip(node);
				}
			}}
			onZoom={(zoom) => {
				zoomLevel = zoom.k;
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

export default memo(ServiceMap);
