import React, { useState, useLayoutEffect, useMemo } from 'react';
import Color from 'color';
import { pushDStree } from 'store/actions';
import {
	SpanItemContainer,
	TraceFlameGraphContainer,
	TOTAL_SPAN_HEIGHT,
} from './styles';
import {
	IIntervalUnit,
	resolveTimeFromInterval,
} from 'container/TraceDetail/utils';
import { toFixed } from 'utils/toFixed';
import useThemeMode from 'hooks/useThemeMode';

const SpanItem = ({
	topOffset = 0, // top offset in px
	leftOffset = 0, // left offset in %
	width = 10, // width in %
	spanData,
	tooltipText,
	onSpanSelect, // function which gets invoked on clicking span
	onSpanHover,
	hoveredSpanId,
	selectedSpanId,
}: {
	topOffset: number;
	leftOffset: number;
	width: number;
	spanData: pushDStree;
	tooltipText: string;
	onSpanSelect: Function;
	onSpanHover: Function;
	hoveredSpanId: string;
	selectedSpanId: string;
}) => {
	const { serviceColour } = spanData;
	const [isSelected, setIsSelected] = useState<boolean>(false);
	const [isLocalHover, setIsLocalHover] = useState<boolean>(false);
	const { isDarkMode } = useThemeMode();

	useLayoutEffect(() => {
		if (
			!isSelected &&
			(spanData.id === hoveredSpanId || spanData.id === selectedSpanId)
		) {
			setIsSelected(true);
		}
	}, [hoveredSpanId, selectedSpanId]);

	const handleHover = (hoverState: boolean) => {
		setIsLocalHover(hoverState);

		if (hoverState) onSpanHover(spanData.id);
		else onSpanHover(null);
	};

	const handleClick = () => {
		onSpanSelect(spanData.id);
	};

	const spanColor = useMemo((): string => {
		const selectedSpanColor = isDarkMode
			? Color(serviceColour).lighten(0.3)
			: Color(serviceColour).darken(0.3);
		return `${isSelected ? selectedSpanColor : serviceColour}`;
	}, [isSelected, serviceColour]);

	return (
		<>
			<SpanItemContainer
				title={tooltipText}
				onClick={handleClick}
				onMouseEnter={() => {
					handleHover(true);
				}}
				onMouseLeave={() => {
					handleHover(false);
				}}
				topOffset={topOffset}
				leftOffset={leftOffset}
				width={width}
				spanColor={spanColor}
				selected={isSelected}
				zIdx={isSelected ? 1 : 0}
			></SpanItemContainer>
		</>
	);
};

const TraceFlameGraph = (props: {
	treeData: pushDStree;
	traceMetaData: any;
	onSpanHover: Function;
	onSpanSelect: Function;
	hoveredSpanId: string;
	selectedSpanId: string;
	intervalUnit: IIntervalUnit;
}) => {
	if (!props.treeData || props.treeData.id === 'empty' || !props.traceMetaData) {
		return null;
	}
	const { intervalUnit } = props;

	const {
		globalStart,
		globalEnd,
		spread,
		totalSpans,
		levels,
	} = props.traceMetaData;
	const RenderSpanRecursive = ({
		level = 0,
		spanData,
		parentLeftOffset = 0,
		onSpanHover,
		onSpanSelect,
		hoveredSpanId,
		selectedSpanId,
	}: {
		spanData: pushDStree;
		level?: number;
		parentLeftOffset?: number;
		onSpanHover: Function;
		onSpanSelect: Function;
		hoveredSpanId: string;
		selectedSpanId: string;
	}) => {
		if (!spanData) {
			return null;
		}

		const leftOffset = ((spanData.startTime - globalStart) * 100) / spread;
		const width = ((spanData.value / 1e6) * 100) / spread;
		const toolTipText = `${spanData.name}\n${toFixed(
			resolveTimeFromInterval(spanData.value / 1e6, intervalUnit),
			2,
		)} ${intervalUnit.name}`;

		return (
			<>
				<SpanItem
					topOffset={level * TOTAL_SPAN_HEIGHT}
					leftOffset={leftOffset}
					width={width}
					spanData={spanData}
					tooltipText={toolTipText}
					onSpanHover={onSpanHover}
					onSpanSelect={onSpanSelect}
					hoveredSpanId={hoveredSpanId}
					selectedSpanId={selectedSpanId}
				/>
				{spanData.children.map((childData) => (
					<RenderSpanRecursive
						level={level + 1}
						spanData={childData}
						key={childData.id}
						parentLeftOffset={leftOffset + parentLeftOffset}
						onSpanHover={onSpanHover}
						onSpanSelect={onSpanSelect}
						hoveredSpanId={hoveredSpanId}
						selectedSpanId={selectedSpanId}
					/>
				))}
			</>
		);
	};
	return (
		<>
			<TraceFlameGraphContainer height={TOTAL_SPAN_HEIGHT * levels}>
				<RenderSpanRecursive
					spanData={props.treeData}
					onSpanHover={props.onSpanHover}
					onSpanSelect={props.onSpanSelect}
					hoveredSpanId={props.hoveredSpanId}
					selectedSpanId={props.selectedSpanId}
				/>
			</TraceFlameGraphContainer>
		</>
	);
};

export default TraceFlameGraph;
