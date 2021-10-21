import { Button, Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import { graphOnClickHandler } from 'components/Graph';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import GridGraphComponent from 'container/GridGraphComponent';
import {
	timeItems,
	timePreferance,
} from 'container/NewWidget/RightContainer/timeItems';
import getChartData from 'lib/getChartData';
import GetMaxMinTime from 'lib/getMaxMinTime';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';

import EmptyGraph from './EmptyGraph';
import { GraphContainer, NotFoundContainer, TimeContainer } from './styles';

const FullView = ({
	widget,
	fullViewOptions = true,
	onClickHandler,
	noDataGraph = false,
}: FullViewProps): JSX.Element => {
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

			const response = await Promise.all(
				widget.query
					.filter((e) => e.query.length !== 0)
					.map(async (query) => {
						const result = await getQueryResult({
							end,
							query: query.query,
							start: start,
							step: '60',
						});
						return {
							query: query.query,
							queryData: result,
							legend: query.legend,
						};
					}),
			);

			const isError = response.find((e) => e.queryData.statusCode !== 200);

			if (isError !== undefined) {
				setState((state) => ({
					...state,
					error: true,
					errorMessage: isError.queryData.error || 'Something went wrong',
					loading: false,
				}));
			} else {
				const chartDataSet = getChartData({
					queryData: {
						data: response.map((e) => ({
							query: e.query,
							legend: e.legend,
							queryData: e.queryData.payload?.result || [],
						})),
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

	if (state.error && !state.loading) {
		return (
			<NotFoundContainer>
				<Typography>{state.errorMessage}</Typography>
			</NotFoundContainer>
		);
	}

	if (state.loading || state.payload === undefined) {
		return (
			<div>
				<Spinner height="80vh" size="large" tip="Loading..." />
			</div>
		);
	}

	if (state.loading === false && state.payload.datasets.length === 0) {
		return (
			<>
				{fullViewOptions && (
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
				)}

				{noDataGraph ? (
					<EmptyGraph
						onClickHandler={onClickHandler}
						widget={widget}
						selectedTime={selectedTime}
					/>
				) : (
					<NotFoundContainer>
						<Typography>No Data</Typography>
					</NotFoundContainer>
				)}
			</>
		);
	}

	return (
		<>
			{fullViewOptions && (
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
			)}

			<GraphContainer>
				<GridGraphComponent
					{...{
						GRAPH_TYPES: widget.panelTypes,
						data: state.payload,
						isStacked: widget.isStacked,
						opacity: widget.opacity,
						title: widget.title,
						onClickHandler: onClickHandler,
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
	fullViewOptions?: boolean;
	onClickHandler?: graphOnClickHandler;
	noDataGraph?: boolean;
}

export default memo(FullView, (prev, next) => {
	if (
		next.widget.query.length !== prev.widget.query.length &&
		next.widget.query.every((value, index) => {
			return value === prev.widget.query[index];
		})
	) {
		return false;
	}

	return true;
});
