import React, { useState } from 'react';
import Trace from './Trace';

import { Wrapper, CardWrapper, CardContainer } from './styles';

const GanttChart = (props: GanttChartProps): JSX.Element => {
	const { data } = props;
	const [activeHoverId, setActiveHoverId] = useState<string>('');

	if (!Array.isArray(data)) {
		return <></>;
	}

	return (
		<>
			<Wrapper>
				<CardContainer>
					<CardWrapper>
						{data.map((e) => (
							<Trace
								activeHoverId={activeHoverId}
								setActiveHoverId={setActiveHoverId}
								key={e.id}
								{...{ ...e }}
							/>
						))}
					</CardWrapper>
				</CardContainer>
			</Wrapper>
		</>
	);
};

interface TraceTagItem {
	key: string;
	value: string;
}

export interface pushDStree {
	id: string;
	name: string;
	value: number;
	time: number;
	startTime: number;
	tags: TraceTagItem[];
	children: pushDStree[];
	parent: pushDStree;
}

interface GanttChartProps {
	data: pushDStree[];
}

export default GanttChart;
