import React, { useEffect, useRef } from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import {
	GlobalTime,
	serviceMapStore,
	getServiceMapItems,
	getDetailedServiceMapItems,
} from "Src/store/actions";
import { StoreState } from "../../store/reducers";
import { getGraphData } from "./utils";
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
		return "loading";
	}

	const { nodes, links } = getGraphData(serviceMap);
	const graphData = { nodes, links };
	return (
		<div>
			<ForceGraph2D
				ref={fgRef}
				cooldownTicks={100}
				onEngineStop={() => fgRef.current.zoomToFit(100, 100)}
				graphData={graphData}
				nodeLabel="id"
				nodeAutoColorBy={(d) => d.id}
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
