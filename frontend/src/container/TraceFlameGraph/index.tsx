/* eslint-disable react/no-unstable-nested-components */
import Color from 'color';
import { ITraceMetaData } from 'container/GantChart';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	Dispatch,
	SetStateAction,
	useLayoutEffect,
	useMemo,
	useState,
} from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import {
	SpanItemContainer,
	TOTAL_SPAN_HEIGHT,
	TraceFlameGraphContainer,
} from './styles';

interface SpanItemProps {
	topOffset: number;
	leftOffset: number;
	width: number;
	spanData: ITraceTree;
	tooltipText: string;
	onSpanSelect: (id: string) => void;
	onSpanHover: Dispatch<SetStateAction<string>>;
	hoveredSpanId: string;
	selectedSpanId: string;
}

function SpanItem({
	topOffset = 0, // top offset in px
	leftOffset = 0, // left offset in %
	width = 10, // width in %
	spanData,
	tooltipText,
	onSpanSelect, // function which gets invoked on clicking span
	onSpanHover,
	hoveredSpanId,
	selectedSpanId,
}: SpanItemProps): JSX.Element {
	const { serviceColour } = spanData;
	const [isSelected, setIsSelected] = useState<boolean>(false);
	// const [isLocalHover, setIsLocalHover] = useState<boolean>(false);
	const isDarkMode = useIsDarkMode();

	useLayoutEffect(() => {
		if (
			!isSelected &&
			(spanData.id === hoveredSpanId || spanData.id === selectedSpanId)
		) {
			setIsSelected(true);
		}
	}, [hoveredSpanId, selectedSpanId, isSelected, spanData]);

	const handleHover = (hoverState: boolean): void => {
		// setIsLocalHover(hoverState);

		if (hoverState) onSpanHover(spanData.id);
		else onSpanHover('');
	};

	const handleClick = (): void => {
		onSpanSelect(spanData.id);
	};

	const spanColor = useMemo((): string => {
		const selectedSpanColor = isDarkMode
			? Color(serviceColour).lighten(0.3)
			: Color(serviceColour).darken(0.3);
		return `${isSelected ? selectedSpanColor : serviceColour}`;
	}, [isSelected, serviceColour, isDarkMode]);

	return (
		<SpanItemContainer
			title={tooltipText}
			onClick={handleClick}
			onMouseEnter={(): void => {
				handleHover(true);
			}}
			onMouseLeave={(): void => {
				handleHover(false);
			}}
			topOffset={topOffset}
			leftOffset={leftOffset}
			width={width}
			spanColor={spanColor}
			selected={isSelected}
			zIdx={isSelected ? 1 : 0}
		/>
	);
}

function TraceFlameGraph(props: {
	treeData: ITraceTree;
	traceMetaData: ITraceMetaData;
	onSpanHover: SpanItemProps['onSpanHover'];
	onSpanSelect: SpanItemProps['onSpanSelect'];
	hoveredSpanId: string;
	selectedSpanId: string;
	missingSpanTree: boolean;
}): JSX.Element {
	const { treeData, traceMetaData, onSpanHover, missingSpanTree } = props;

	if (!treeData || treeData.id === 'empty' || !traceMetaData) {
		return <div />;
	}
	const { onSpanSelect, hoveredSpanId, selectedSpanId } = props;

	const { globalStart, spread, levels } = traceMetaData;
	function RenderSpanRecursive({
		level = 0,
		spanData,
		parentLeftOffset = 0,
		onSpanHover,
		onSpanSelect,
		hoveredSpanId,
		selectedSpanId,
	}: {
		spanData: ITraceTree;
		level: number;
		parentLeftOffset: number;
		onSpanHover: SpanItemProps['onSpanHover'];
		onSpanSelect: SpanItemProps['onSpanSelect'];
		hoveredSpanId: string;
		selectedSpanId: string;
	}): JSX.Element {
		if (!spanData) {
			return <div />;
		}

		const leftOffset = ((spanData.startTime - globalStart) * 100) / spread;
		const width = ((spanData.value / 1e6) * 100) / spread;
		const toolTipText = `${spanData.name}`;

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
	}

	return (
		<TraceFlameGraphContainer height={TOTAL_SPAN_HEIGHT * levels}>
			<RenderSpanRecursive
				spanData={treeData}
				onSpanHover={onSpanHover}
				onSpanSelect={onSpanSelect}
				hoveredSpanId={hoveredSpanId}
				selectedSpanId={selectedSpanId}
				level={missingSpanTree ? -1 : 0}
				parentLeftOffset={0}
			/>
		</TraceFlameGraphContainer>
	);
}

export default TraceFlameGraph;
