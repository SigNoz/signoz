import { Button, Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import GridGraphComponent from 'container/GridGraphComponent';
import {
	timeItems,
	timePreferance,
} from 'container/NewWidget/RightContainer/timeItems';
import getChartData from 'lib/getChartData';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { GlobalTime } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';

import { GraphContainer, NotFoundContainer, TimeContainer } from './styles';

const FullView = ({ widget }: FullViewProps): JSX.Element => {
	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);

	const [state, setState] = useState<FullViewState>({
		error: false,
		errorMessage: '',
		loading: true,
		payload: undefined,
	});

	const getSelectedTime = useCallback(
		() =>
			timeItems.find((e) => e.enum === (widget?.timePreferance || 'GLOBAL_TIME')),
		[widget],
	);

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: widget?.timePreferance || 'GLOBAL_TIME',
	});

	const onFetchDataHandler = useCallback(async () => {
		try {
			const { end, start } = getStartAndEndTime({
				type: selectedTime.enum,
				maxTime,
				minTime,
			});

			const response = await Promise.all(
				widget.query
					.filter((e) => e.query.length !== 0)
					.map(async (query) => {
						const result = await getQueryResult({
							end,
							query: query.query,
							start: start,
							step: '30',
						});
						return result;
					}),
			);

			const isError = response.find((e) => e.statusCode !== 200);

			if (isError !== undefined) {
				setState((state) => ({
					...state,
					error: true,
					errorMessage: isError.error || 'Something went wrong',
					loading: false,
				}));
			} else {
				const intialQuery: QueryData[] = [];

				const finalQueryData: QueryData[] = response.reduce((acc, current) => {
					return [...acc, ...(current.payload?.result || [])];
				}, intialQuery);

				const chartDataSet = getChartData({
					query: widget.query,
					queryData: {
						data: finalQueryData,
						error: false,
						errorMessage: '',
						loading: false,
					},
				});

				setState((state) => ({
					...state,
					loading: false,
					payload: chartDataSet,
				}));
			}
		} catch (error) {
			setState((state) => ({
				...state,
				error: true,
				errorMessage: (error as AxiosError).toString(),
				loading: false,
			}));
		}
	}, [widget, maxTime, minTime, selectedTime.enum]);

	useEffect(() => {
		onFetchDataHandler();
	}, [onFetchDataHandler]);

	if (state.loading || state.payload === undefined) {
		return <Spinner height="80vh" size="large" tip="Loading..." />;
	}

	if (state.loading === false && state.payload.datasets.length === 0) {
		return (
			<>
				<TimePreference
					{...{
						selectedTime,
						setSelectedTime,
					}}
				/>
				<NotFoundContainer>
					<Typography>No Data</Typography>
				</NotFoundContainer>
			</>
		);
	}

	return (
		<>
			<TimeContainer>
				<TimePreference
					{...{
						selectedTime,
						setSelectedTime,
					}}
				/>
				<Button onClick={onFetchDataHandler} type="primary">
					Refresh
				</Button>
			</TimeContainer>

			<GraphContainer>
				<GridGraphComponent
					{...{
						GRAPH_TYPES: widget.panelTypes,
						data: state.payload,
						isStacked: widget.isStacked,
						opacity: widget.opacity,
						title: widget.title,
					}}
				/>
			</GraphContainer>
		</>
	);
};

interface FullViewState {
	loading: boolean;
	error: boolean;
	errorMessage: string;
	payload: ChartData | undefined;
}

interface FullViewProps {
	widget: Widgets;
}

export default FullView;
