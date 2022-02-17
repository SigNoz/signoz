import React, { useState } from 'react';
import Color from 'color';
import { Tooltip } from 'antd';
import { pushDStree, span } from 'store/actions';

import {
	SpanItemContainer,
	TraceFlameGraphContainer,
	TOTAL_SPAN_HEIGHT,
} from './styles';

const SpanItem = ({
	topOffset = 0, // top offset in px
	leftOffset = 0, // left offset in %
	width = 10, // width in %
	spanData,
	tooltipText,
	onSpanClick, // function which gets invoked on clicking span
	onSpanHover,
}: {
	topOffset: number;
	leftOffset: number;
	width: number;
	spanData: pushDStree;
	tooltipText: string;
	onSpanClick?: Function;
	onSpanHover?: Function;
}) => {
	const [isSelected, setIsSelected] = useState<boolean>(false);

	const handleHover = (hoverState: boolean) => {
		setIsSelected(hoverState);
		// onSpanHover()
	};

	const handleClick = () => {
		setIsSelected(true);
		// onSpanClick();
		// TODO
	};

	return (
		<>
			<Tooltip
				placement="top"
				overlayStyle={{
					whiteSpace: 'pre-line',
					fontSize: '0.7rem',
				}}
				title={tooltipText}
				key={spanData.name}
			>
				<SpanItemContainer
					onClick={handleClick}
					topOffset={topOffset}
					leftOffset={leftOffset}
					width={width}
					spanColor={
						isSelected
							? `${Color(spanData.serviceColour).lighten(0.3)}`
							: `${spanData.serviceColour}`
					}
					onMouseEnter={() => {
						handleHover(true);
					}}
					onMouseLeave={() => {
						handleHover(false);
					}}
					selected={isSelected}
				></SpanItemContainer>
			</Tooltip>
		</>
	);
};

const TraceFlameGraph = (props: {
	treeData: pushDStree;
	traceMetaData: any;
}) => {
	if (!props.treeData || props.treeData.id === 'empty') {
		return null;
	}
	const {
		globalStart,
		globalEnd,
		spread,
		totalSpans,
		levels,
	} = props.traceMetaData;

	const [treeData, setTreeData] = useState<pushDStree>(props.treeData);
	const RenderSpanRecursive = ({
		level = 0,
		spanData,
		parentLeftOffset = 0,
	}: {
		spanData: pushDStree;
		level?: number;
		parentLeftOffset?: number;
	}) => {
		if (!spanData) {
			return null;
		}

		const leftOffset = ((spanData.startTime * 1e6 - globalStart) * 1e8) / spread;
		const width = (spanData.value * 1e8) / spread;
		const toolTipText = `${spanData.name}\n${spanData.value / 1e6} ms`;

		return (
			<>
				<SpanItem
					topOffset={level * TOTAL_SPAN_HEIGHT}
					leftOffset={leftOffset}
					width={width}
					spanData={spanData}
					tooltipText={toolTipText}
				/>
				{spanData.children.map((childData) => (
					<RenderSpanRecursive
						level={level + 1}
						spanData={childData}
						key={childData.id}
						parentLeftOffset={leftOffset + parentLeftOffset}
					/>
				))}
			</>
		);
	};
	return (
		<>
			<TraceFlameGraphContainer height={TOTAL_SPAN_HEIGHT * levels}>
				<RenderSpanRecursive spanData={treeData} />
			</TraceFlameGraphContainer>
		</>
	);
};

export default TraceFlameGraph;
