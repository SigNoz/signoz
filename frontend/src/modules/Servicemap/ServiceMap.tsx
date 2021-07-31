import React, { useEffect, useRef } from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import {
	GlobalTime,
	serviceMapStore,
	getServiceMapItems,
	getDetailedServiceMapItems,
} from "Src/store/actions";
import styled from "styled-components";
import { StoreState } from "../../store/reducers";

import { getZoomPx, getGraphData, getTooltip, transformLabel } from "./utils";
import SelectService from "./SelectService";
import { ForceGraph2D } from "react-force-graph";
import { useRoute } from "../RouteProvider";
import { CustomSpinner } from "../../components/Spiner";

const Container = styled.div`
	.force-graph-container .graph-tooltip {
		background: black;
		padding: 1px;
		.keyval {
			display: flex;
			.key {
				margin-right: 4px;
			}
			.val {
				margin-left: auto;
			}
		}
	}
`;

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
	const { state } = useRoute();

	const {
		getDetailedServiceMapItems,
		getServiceMapItems,
		globalTime,
		serviceMap,
	} = props;

	useEffect(() => {
		/*
			Call the apis only when the route is loaded.
			Check this issue: https://github.com/SigNoz/signoz/issues/110
		 */
		if (state.SERVICE_MAP.isLoaded) {
			getServiceMapItems(globalTime);
			getDetailedServiceMapItems(globalTime);
		}
	}, [globalTime]);

	useEffect(() => {
		fgRef.current && fgRef.current.d3Force("charge").strength(-400);
	});
	if (!serviceMap.items.length || !serviceMap.services.length) {
		return <CustomSpinner size="large" tip="Loading..."/>;
	}

	const zoomToService = (value: string) => {
		fgRef && fgRef.current.zoomToFit(700, getZoomPx(), (e) => e.id === value);
	};

	const zoomToDefault = () => {
		fgRef && fgRef.current.zoomToFit(100, 120);
	};

	const { nodes, links } = getGraphData(serviceMap);
	const graphData = { nodes, links };
	return (
		<Container>
			<SelectService
				services={serviceMap.services}
				zoomToService={zoomToService}
				zoomToDefault={zoomToDefault}
			/>
			<ForceGraph2D
				ref={fgRef}
				cooldownTicks={100}
				graphData={graphData}
				nodeLabel={getTooltip}
				linkAutoColorBy={(d) => d.target}
				linkDirectionalParticles="value"
				linkDirectionalParticleSpeed={(d) => d.value}
				nodeCanvasObject={(node, ctx, globalScale) => {
					const label = transformLabel(node.id);
					const fontSize = node.fontSize;
					ctx.font = `${fontSize}px Roboto`;
					const width = node.width;

					ctx.fillStyle = node.color;
					ctx.beginPath();
					ctx.arc(node.x, node.y, width, 0, 2 * Math.PI, false);
					ctx.fill();
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillStyle = "#646464";
					ctx.fillText(label, node.x, node.y);
				}}
				onNodeClick={(node) => {
					const tooltip = document.querySelector(".graph-tooltip");
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
		</Container>
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
