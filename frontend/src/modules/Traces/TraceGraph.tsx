import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { flamegraph } from "d3-flame-graph";
import { connect } from "react-redux";
import { Card, Button, Row, Col, Space } from "antd";
import * as d3 from "d3";
import * as d3Tip from "d3-tip";
import "./TraceGraph.css";
import { spanToTreeUtil } from "../../utils/spanToTree";
import { fetchTraceItem, spansWSameTraceIDResponse } from "../../store/actions";
import { StoreState } from "../../store/reducers";
import SelectedSpanDetails from "./SelectedSpanDetails";
import TraceGanttChart  from "./TraceGanttChart";

interface TraceGraphProps {
	traceItem: spansWSameTraceIDResponse;
	fetchTraceItem: Function;
}

const _TraceGraph = (props: TraceGraphProps) => {
	const params = useParams<{ id?: string }>();
	const [clickedSpanTags, setClickedSpanTags] = useState([]);
	const [resetZoom, setResetZoom] = useState(false);
	const [treeData, setTreeData] = useState([]);

	useEffect(() => {
		//sets span width based on value - which is mapped to duration
		props.fetchTraceItem(params.id);
	}, []);

	useEffect(() => {
		if (props.traceItem || resetZoom) {
			const tree = spanToTreeUtil(props.traceItem[0].events);
			console.log("tree", tree)

			setTreeData([tree]);
			// This is causing element to change ref. Can use both useRef or this approach.
			d3.select("#chart").datum(tree).call(chart);
			setResetZoom(false);
		}

	}, [props.traceItem, resetZoom]);
	// if this monitoring of props.traceItem.data is removed then zoom on click doesn't work
	// Doesn't work if only do initial check, works if monitor an element - as it may get updated in sometime

	const tip = d3Tip
		.default()
		.attr("class", "d3-tip")
		.html(function (d: any) {
			return d.data.name + "<br>duration: " + d.data.value / 1000000 + "ms";
		});

	const onClick = (z: any) => {
		setClickedSpanTags(z.data.tags);
		console.log(`Clicked on ${z.data.name}, id: "${z.id}"`);
	};

	const chart = flamegraph()
		.cellHeight(48)
		.transitionDuration(500)
		.inverted(true)
		.tooltip(tip)
		.minFrameSize(10)
		.elided(false)
		.differential(false)
		.sort(true)
		//Use self value=true when we're using not using aggregated option, Which is not our case.
		// In that case it's doing step function sort of stuff thru computation.
		// Source flamegraph.js line 557 and 573.
		// .selfValue(true)
		.onClick(onClick)
	// Purple if highlighted, otherwise the original color
		.setColorMapper(function(node, originalColor) {
			return node.data.name.includes('frontend') ? "#D291BC" : originalColor;
	})


	return (
		<Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
			<Col md={24} sm={24}>
				<Space direction="vertical" size="middle" style={{ width: "100%" }}>
					<Card bodyStyle={{ padding: 80 }} style={{ height: 320 }}>
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								flexDirection: "column",
								alignItems: "center",
							}}
						>
							<div style={{ textAlign: "center" }}>
								Trace Graph component ID is {params.id}{" "}
							</div>
							<Button
								type="primary"
								onClick={setResetZoom.bind(this, true)}
								style={{ width: 160 }}
							>
								Reset Zoom
							</Button>
							<div id="chart" style={{ fontSize: 12, marginTop: 20 }}></div>
						</div>
					</Card>

					<SelectedSpanDetails clickedSpanTags={clickedSpanTags} />
					<div className={'collapsable'}>
						<TraceGanttChart treeData = {treeData}/>
					</div>
				</Space>
			</Col>
		</Row>
	);
};

const mapStateToProps = (
	state: StoreState,
): { traceItem: spansWSameTraceIDResponse } => {
	return { traceItem: state.traceItem };
};

export const TraceGraph = connect(mapStateToProps, {
	fetchTraceItem: fetchTraceItem,
})(_TraceGraph);
