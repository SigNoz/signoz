import React, { useMemo } from 'react';
import Trace from './Trace';

import { Wrapper, CardWrapper, CardContainer, ButtonContainer } from './styles';
import { pushDStree } from 'store/actions';
import { Button } from 'antd';
import { getNodeById, getSpanPath } from './utils';
import { FilterOutlined } from '@ant-design/icons';

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
		spanId
	} = props;

	const { globalStart, spread: globalSpread } = traceMetaData;

	const activeSpanPath = useMemo(() => {
		return getSpanPath(data, spanId)
	}, [spanId])

	return (
		<>
			<Wrapper>
				<CardContainer>
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
}

export default GanttChart;
