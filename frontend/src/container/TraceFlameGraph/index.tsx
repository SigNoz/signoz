import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { pushDStree, span } from 'store/actions';
import { SpanItemContainer, TraceFlameGraphContainer } from './styles';

/**
 * Traverses the Span Tree data and returns the relevant meta data.
 * Metadata includes globalStart, globalEnd,
 */

// const spanServiceNameToColourMapping = (spans: span[]) => {
// 	const serviceNameSet = new Set();
// 	spans.forEach((spanItem) => {
// 		serviceNameSet.add(spanItem[3]);
// 	});
// 	debugger;
// };
const getMetaDataFromSpanTree = (treeData: pushDStree) => {
	let globalStart = Number.POSITIVE_INFINITY;
	let globalEnd = Number.NEGATIVE_INFINITY;
	let totalSpans = 0;
	let levels = 1;
	const traverse = (treeNode: pushDStree, level: number = 0) => {
		if (!treeNode) {
			return;
		}
		totalSpans++;
		levels = Math.max(levels, level);
		const startTime = treeNode.startTime;
		const endTime = startTime + treeNode.value;
		globalStart = Math.min(globalStart, startTime);
		globalEnd = Math.max(globalEnd, endTime);

		for (const childNode of treeNode.children) {
			traverse(childNode, level + 1);
		}
	};
	traverse(treeData, 1);

	globalStart = globalStart * 1e6;
	globalEnd = globalEnd * 1e6;

	return {
		globalStart,
		globalEnd,
		spread: globalEnd - globalStart,
		totalSpans,
		levels,
	};
};

const SpanItem = ({
	topOffset = 0,
	leftOffset = 0,
	width = 10,
	nodeData,
	onSpanSelect,
}: {
	topOffset: number;
	leftOffset: number;
	width: number;
	nodeData: pushDStree;
	onSpanSelect: Function;
}) => {
	const [isSelected, setIsSelected] = useState<boolean>(false);
	const handleHover = () => {
		setIsSelected((prevState) => !prevState);
	};
	return (
		<>
			<Tooltip placement="top" title={nodeData.name} key={nodeData.name}>
				<SpanItemContainer
					onClick={() => onSpanSelect(nodeData)}
					topOffset={topOffset}
					leftOffset={leftOffset}
					width={width}
					onMouseEnter={() => {
						setIsSelected(true);
						console.log('Enter');
					}}
					onMouseLeave={() => {
						setIsSelected(false);
						console.log('leave');
					}}
					selected={isSelected}
				></SpanItemContainer>
			</Tooltip>
		</>
	);
};

const TraceFlameGraph = (props: { treeData: pushDStree }) => {
	if (!props.treeData || props.treeData.id === 'empty') {
		return null;
	}

	const [treeData, setTreeData] = useState<pushDStree>(props.treeData);

	const handleSpanSelection = (selectedNodeData: pushDStree) => {
		setTreeData(selectedNodeData);
	};
	const {
		globalStart,
		globalEnd,
		spread,
		totalSpans,
		levels,
	} = getMetaDataFromSpanTree(treeData);
	const vSize = 12;

	const RenderSpanRecursive = ({
		level = 0,
		nodeData,
		parentLeftOffset = 0,
	}: {
		nodeData: pushDStree;
		level?: number;
		parentLeftOffset?: number;
	}) => {
		if (!nodeData) {
			return null;
		}
		const leftOffset = ((nodeData.startTime * 1e6 - globalStart) * 1e8) / spread;

		const width = (nodeData.value * 1e8) / spread;
		return (
			<>
				<SpanItem
					topOffset={level * vSize}
					leftOffset={leftOffset}
					width={width}
					nodeData={nodeData}
					onSpanSelect={handleSpanSelection}
				/>
				{nodeData.children.map((childData) => (
					<RenderSpanRecursive
						level={level + 1}
						nodeData={childData}
						key={childData.id}
						parentLeftOffset={leftOffset + parentLeftOffset}
					/>
				))}
			</>
		);
	};
	return (
		<>
			<TraceFlameGraphContainer height={vSize * levels}>
				<RenderSpanRecursive nodeData={treeData} />
			</TraceFlameGraphContainer>
			<button onClick={() => setTreeData(props.treeData)}>Reset</button>
		</>
	);
};

export default TraceFlameGraph;
