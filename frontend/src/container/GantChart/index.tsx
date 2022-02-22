import React, { useState } from 'react';
import Trace from './Trace';

import { Wrapper, CardWrapper, CardContainer, ButtonContainer } from './styles';
import { pushDStree } from 'store/actions';
import { Button } from 'antd';
import { getNodeById } from './utils';

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
	} = props;

	const { globalStart, spread: globalSpread } = traceMetaData;

	const onFocusHandler = () => {
		const treeNode = getNodeById(activeSelectedId, data);
		if (treeNode) {
			setTreeData(treeNode);
		}
	};

	return (
		<>
			<Wrapper>
				<ButtonContainer>
					<Button onClick={onFocusHandler}>Focus on selected spans</Button>
					<Button onClick={onResetHandler}>Reset</Button>
				</ButtonContainer>

				<CardContainer>
					<CardWrapper>
						<Trace
							activeHoverId={activeHoverId}
							setActiveHoverId={setActiveHoverId}
							key={data.id}
							{...{
								...data,
								globalSpread,
								globalStart,
								setActiveSelectedId,
								activeSelectedId,
							}}
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
}

export default GanttChart;
