import React, { useEffect, useState } from 'react';
import Trace from './Trace';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { Wrapper, CardWrapper, CardContainer, CollapseButton } from './styles';
import { getSpanPath } from './utils';
import { IIntervalUnit } from 'container/TraceDetail/utils'
import { ITraceTree } from 'types/api/trace/getTraceItem';

const GanttChart = (props: GanttChartProps): JSX.Element => {
	const {
		data,
		traceMetaData,
		activeHoverId,
		setActiveHoverId,
		activeSelectedId,
		setActiveSelectedId,
		spanId,
		intervalUnit
	} = props;

	const { globalStart, spread: globalSpread } = traceMetaData;

	const [isExpandAll, setIsExpandAll] = useState<boolean>(false);
	const [activeSpanPath, setActiveSpanPath] = useState<string[]>([]);

	useEffect(() => {
		setActiveSpanPath(getSpanPath(data, spanId))
	}, [spanId]);

	useEffect(() => {
		setActiveSpanPath(getSpanPath(data, activeSelectedId))
	}, [activeSelectedId]);

	const handleCollapse = () => {
		setIsExpandAll((prev) => !prev);
	};
	return (
		<>
			<Wrapper>
				<CardContainer>
					<CollapseButton onClick={handleCollapse} style={{ fontSize: '1.2rem' }} title={isExpandAll ? 'Collapse All' : "Expand All"}>
						{isExpandAll ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
					</CollapseButton>
					<CardWrapper>
						<Trace
							activeHoverId={activeHoverId}
							activeSpanPath={activeSpanPath}
							setActiveHoverId={setActiveHoverId}
							key={data.id}
							{...{
								...data,
								globalSpread,
								globalStart,
								setActiveSelectedId,
								activeSelectedId,
							}}
							level={0}
							isExpandAll={isExpandAll}
							intervalUnit={intervalUnit}
						/>
					</CardWrapper>
				</CardContainer>
			</Wrapper>
		</>
	);
};

export interface ITraceMetaData {
	globalEnd: number;
	globalStart: number;
	levels: number;
	spread: number;
	totalSpans: number;
}

export interface GanttChartProps {
	data: ITraceTree;
	traceMetaData: ITraceMetaData;
	activeSelectedId: string;
	activeHoverId: string;
	setActiveHoverId: React.Dispatch<React.SetStateAction<string>>;
	setActiveSelectedId: React.Dispatch<React.SetStateAction<string>>;
	spanId: string;
	intervalUnit: IIntervalUnit
}

export default GanttChart;
