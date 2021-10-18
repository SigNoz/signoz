import Graph from 'components/Graph';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import getDateArrayFromStartAndEnd from 'lib/getDateArrayFromStartAndEnd';
import GetMaxMinTime from 'lib/getMaxMinTime';
import { colors } from 'lib/getRandomColor';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';

const EmptyGraph = ({ selectedTime, widget }: EmptyGraphProps): JSX.Element => {
	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);

	const maxMinTime = GetMaxMinTime({
		graphType: widget.panelTypes,
		maxTime,
		minTime,
	});

	const { end, start } = getStartAndEndTime({
		type: selectedTime.enum,
		maxTime: maxMinTime.maxTime,
		minTime: maxMinTime.minTime,
	});

	const dates = getDateArrayFromStartAndEnd({
		start: start,
		end: end,
	});

	return (
		<Graph
			{...{
				type: 'line',
				data: {
					datasets: [
						{
							data: new Array(dates?.length).fill(0),
							borderColor: colors[0],
							showLine: true,
							borderWidth: 1.5,
							spanGaps: true,
							pointRadius: 0,
						},
					],
					labels: dates,
				},
			}}
		/>
	);
};

interface EmptyGraphProps {
	selectedTime: timePreferance;
	widget: Widgets;
}

export default EmptyGraph;
