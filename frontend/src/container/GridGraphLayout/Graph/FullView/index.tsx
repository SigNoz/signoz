import { Button, Typography } from 'antd';
import { ChartData } from 'chart.js';
import { GraphOnClickHandler } from 'components/Graph';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import GridGraphComponent from 'container/GridGraphComponent';
import useQuery from 'container/GridGraphLayout/utils/useQuery';
import {
	timeItems,
	timePreferance,
	timePreferenceType,
} from 'container/NewWidget/RightContainer/timeItems';
import convertToNanoSecondsToSecond from 'lib/convertToNanoSecondsToSecond';
import GetMinMax from 'lib/getMinMax';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import { NotFoundContainer, TimeContainer } from './styles';

function FullView({
	widget,
	fullViewOptions = true,
	onClickHandler,
	name,
	yAxisUnit,
}: FullViewProps): JSX.Element {
	const { minTime, maxTime, selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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

	const onFetchDataHandler = useCallback(async (): Promise<void> => {
		const getGlobalMinMax = (
			time: timePreferenceType,
		): GlobalMinMaxTime | undefined => {
			if (time === 'GLOBAL_TIME') {
				const minMax = GetMinMax(globalSelectedTime);
				return {
					min: convertToNanoSecondsToSecond(minMax.minTime / 1000),
					max: convertToNanoSecondsToSecond(minMax.maxTime / 1000),
				};
			}

			return undefined;
		};

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const graphData = await useQuery(
			widget,
			minTime,
			maxTime,
			getGlobalMinMax(selectedTime.enum),
			selectedTime,
		);
		setState((state) => ({
			...state,
			...graphData,
		}));
	}, [widget, minTime, maxTime, selectedTime, globalSelectedTime]);

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

			{/* <GraphContainer> */}
			<GridGraphComponent
				{...{
					GRAPH_TYPES: widget.panelTypes,
					data: state.payload,
					isStacked: widget.isStacked,
					opacity: widget.opacity,
					title: widget.title,
					onClickHandler,
					name,
					yAxisUnit,
				}}
			/>
			{/* </GraphContainer> */}
		</>
	);
}

interface GlobalMinMaxTime {
	min: string;
	max: string;
}

interface FullViewState {
	loading: boolean;
	error: boolean;
	errorMessage: string;
	payload: ChartData | undefined;
}

interface FullViewProps {
	widget: Widgets;
	fullViewOptions?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
}

FullView.defaultProps = {
	fullViewOptions: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
};

export default FullView;
