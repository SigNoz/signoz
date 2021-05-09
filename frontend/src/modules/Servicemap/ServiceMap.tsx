import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import {
	GlobalTime,
	serviceMapStore,
	getServiceMapItems,
	getDetailedServiceMapItems,
} from "Src/store/actions";
import { Spin } from "antd";

import { StoreState } from "../../store/reducers";
import { getGraphData } from "./utils";
import SelectService from "./SelectService";
import { ForceGraph2D } from "react-force-graph";
interface ServiceMapProps extends RouteComponentProps<any> {
	serviceMap: serviceMapStore;
	globalTime: GlobalTime;
	getServiceMapItems: Function;
	getDetailedServiceMapItems: Function;
}
interface graphNode {
	id: string;
	group: number;
}
interface graphLink {
	source: string;
	target: string;
	value: number;
}
export interface graphDataType {
	nodes: graphNode[];
	links: graphLink[];
}

const ServiceMap = (props: ServiceMapProps) => {
	const fgRef = useRef();
	const {
		getDetailedServiceMapItems,
		getServiceMapItems,
		globalTime,
		serviceMap,
	} = props;

	useEffect(() => {
		getServiceMapItems(globalTime);
		getDetailedServiceMapItems(globalTime);
	}, []);

	if (!serviceMap.items.length || !serviceMap.services.length) {
		return <Spin />;
	}

	const zoomToService = (value: string) => {
		fgRef && fgRef.current.zoomToFit(700, 360, (e) => e.id === value);
	};

	const { nodes, links } = getGraphData(serviceMap);
	const graphData = { nodes, links };
	return (
		<div>
			<SelectService
				services={serviceMap.services}
				zoomToService={zoomToService}
			/>
			<ForceGraph2D
				ref={fgRef}
				enableNodeDrag={false}
				cooldownTicks={100}
				onEngineStop={() => fgRef.current.zoomToFit(100, 200)}
				graphData={graphData}
				nodeLabel="id"
				linkAutoColorBy={(d) => d.target}
				linkDirectionalParticles="value"
				linkDirectionalParticleSpeed={(d) => d.value}
				nodeCanvasObject={(node, ctx, globalScale) => {
					const label = node.id;
					const fontSize = node.fontSize;
					ctx.font = `${fontSize}px Sans-Serif`;
					const textWidth = ctx.measureText(label).width;
					const width = textWidth > node.width ? textWidth : node.width;
					const bckgDimensions = [width, fontSize].map((n) => n + fontSize); // some padding
					ctx.fillStyle = node.color;
					ctx.fillRect(
						node.x - bckgDimensions[0] / 2,
						node.y - bckgDimensions[1] / 2,
						...bckgDimensions,
					);

					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillStyle = "black";
					ctx.fillText(label, node.x, node.y);

					node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
				}}
				onNodeClick={(node) => {
					const tooltip = document.querySelector(".graph-tooltip");
					if (tooltip && node) {
						tooltip.innerHTML = `<div style="padding:12px;background: black;border: 1px solid #BDBDBD;border-radius: 2px;">
								<div style="color:white; font-weight:bold; margin-bottom:8px;">${node.id}</div>
								<div style="color:white">P99 latency: ${node.p99 / 1000000}</div>
								<div style="color:white">Error Rate: ${node.errorRate}%</div>
								<div style="color:white">Request Per Sec: ${node.callRate}</div>
							</div>`;
					}
				}}
				nodePointerAreaPaint={(node, color, ctx) => {
					ctx.fillStyle = color;
					const bckgDimensions = node.__bckgDimensions;
					bckgDimensions &&
						ctx.fillRect(
							node.x - bckgDimensions[0] / 2,
							node.y - bckgDimensions[1] / 2,
							...bckgDimensions,
						);
				}}
			/>
		</div>
	);
};

const mapStateToProps = (
	state: StoreState,
): {
	serviceMap: serviceMapStore;
	globalTime: GlobalTime;
} => {
	return {
		serviceMap: state.serviceMap,
		globalTime: state.globalTime,
	};
};

export default connect(mapStateToProps, {
	getServiceMapItems: getServiceMapItems,
	getDetailedServiceMapItems: getDetailedServiceMapItems,
})(ServiceMap);
