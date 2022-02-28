import React, { useMemo, useState, useCallback } from 'react';
import Trace from './Trace';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { Wrapper, CardWrapper, CardContainer, ButtonContainer, CollapseButton } from './styles';
import { pushDStree } from 'store/actions';
import { Button } from 'antd';
import { getNodeById, getSpanPath } from './utils';
import { FilterOutlined } from '@ant-design/icons';
import { IIntervalUnit } from 'container/TraceDetail/utils'

const GanttChart = (props: GanttChartProps): JSX.Element => {
	const {
		data,
		traceMetaData,
		onResetHandler,
		setTreeData,
		activeHoverId,
		setActiveHoverId,
		activeSelectedId,
		setActiveSelectedId,
		spanId,
		intervalUnit
	} = props;

	const { globalStart, spread: globalSpread } = traceMetaData;

	const [isExpandAll, setIsExpandAll] = useState<boolean>(false);

	const activeSpanPath = useMemo(() => {
		return getSpanPath(data, spanId)
	}, [spanId])

	const handleCollapse = () => {
		setIsExpandAll(prev => !prev)
	}
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
	data: pushDStree;
	traceMetaData: ITraceMetaData;
	onResetHandler: VoidFunction;
	setTreeData: React.Dispatch<React.SetStateAction<pushDStree>>;
	activeSelectedId: string;
	activeHoverId: string;
	setActiveHoverId: React.Dispatch<React.SetStateAction<string>>;
	setActiveSelectedId: React.Dispatch<React.SetStateAction<string>>;
	spanId: string;
	intervalUnit: IIntervalUnit
}

export default GanttChart;
