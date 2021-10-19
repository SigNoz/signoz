import Graph from 'components/Graph';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import GetMaxMinTime from 'lib/getMaxMinTime';
import { colors } from 'lib/getRandomColor';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

const EmptyGraph = ({ selectedTime, widget }: EmptyGraphProps): JSX.Element => {
	const { minTime, maxTime, loading } = useSelector<AppState, GlobalReducer>(
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

	const dateFunction = useCallback(() => {
		if (!loading) {
			const dates: Date[] = [];

			const getTimeString = (time: string): string => {
				const timeString = time.split('.').join('').slice(0, 13);

				if (timeString.length < 13) {
					const lengthMissing = timeString.length - 13;

					const numberZero = new Array(Math.abs(lengthMissing)).fill(0).join('');

					return timeString + numberZero;
				}

				return timeString;
			};

			const startString = getTimeString(start);
			const endString = getTimeString(end);

			const parsedStart = parseInt(startString, 10);
			const parsedEnd = parseInt(endString, 10);

			let startDate = parsedStart;
			const endDate = parsedEnd;

			while (endDate >= startDate) {
				const newDate = new Date(startDate);

				startDate = startDate + 20000;

				dates.push(newDate);
			}
			return dates;
		}
		return [];
	}, [start, end, loading]);

	const date = dateFunction();

	return (
		<Graph
			{...{
				type: 'line',
				data: {
					datasets: [
						{
							data: new Array(date?.length).fill(0),
							borderColor: colors[0],
							showLine: true,
							borderWidth: 1.5,
							spanGaps: true,
							pointRadius: 0,
						},
					],
					labels: date,
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
