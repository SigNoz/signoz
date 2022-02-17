import React from 'react';
import { Card } from 'antd';
import { CaretDownFilled } from '@ant-design/icons';

import { CardComponent } from './styles';

const GanttChart = (props: GanttChartProps): JSX.Element => {
	const { data } = props;
	console.log(data);

	return (
		<div>
			<CardComponent>
				243
				<CaretDownFilled />
			</CardComponent>
		</div>
	);
};

interface TraceTagItem {
	key: string;
	value: string;
}

interface pushDStree {
	id: string;
	name: string;
	value: number;
	time: number;
	startTime: number;
	tags: TraceTagItem[];
	children: pushDStree[];
}

interface GanttChartProps {
	data: pushDStree[];
}

export default GanttChart;
