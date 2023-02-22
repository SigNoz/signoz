import { Button, Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import { GraphOnClickHandler } from 'components/Graph';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import GridGraphComponent from 'container/GridGraphComponent';
import {
	timeItems,
	timePreferance,
	timePreferenceType,
} from 'container/NewWidget/RightContainer/timeItems';
import convertToNanoSecondsToSecond from 'lib/convertToNanoSecondsToSecond';
import getChartData from 'lib/getChartData';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetMinMax from 'lib/getMinMax';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import getStep from 'lib/getStep';
import React, { useCallback, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { PromQLWidgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import { NotFoundContainer, TimeContainer } from './styles';

function FullView({
	widget,
	fullViewOptions = true,
	onClickHandler,
	name,
	yAxisUnit,
	onDragSelect,
}: FullViewProps): JSX.Element {
	const { minTime, maxTime, selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getSelectedTime = useCallback(
		() =>
			timeItems.find((e) => e.enum === (widget?.timePreferance || 'GLOBAL_TIME')),
		[widget],
	);

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: widget?.timePreferance || 'GLOBAL_TIME',
	});

	const maxMinTime = GetMaxMinTime({
		graphType: widget.panelTypes,
		maxTime,
		minTime,
	});

	const getMinMax = (
		time: timePreferenceType,
	): { min: string | number; max: string | number } => {
		if (time === 'GLOBAL_TIME') {
			const minMax = GetMinMax(globalSelectedTime, [
				minTime / 1000000,
				maxTime / 1000000,
			]);
			return {
				min: convertToNanoSecondsToSecond(minMax.minTime / 1000),
				max: convertToNanoSecondsToSecond(minMax.maxTime / 1000),
			};
		}

		const minMax = getStartAndEndTime({
			type: selectedTime.enum,
			maxTime: maxMinTime.maxTime,
			minTime: maxMinTime.minTime,
		});
		return { min: parseInt(minMax.start, 10), max: parseInt(minMax.end, 10) };
	};

	const queryMinMax = getMinMax(selectedTime.enum);

	const queryLength = widget.query.filter((e) => e.query.length !== 0);

	const response = useQueries(
		queryLength.map((query) => ({
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			queryFn: () =>
				getQueryResult({
					end: queryMinMax.max.toString(),
					query: query.query,
					start: queryMinMax.min.toString(),
					step: `${getStep({
						start: queryMinMax.min,
						end: queryMinMax.max,
						inputFormat: 's',
					})}`,
				}),
			queryHash: `${query.query}-${query.legend}-${selectedTime.enum}`,
			retryOnMount: false,
		})),
	);

	const isError =
		response.find((e) => e?.data?.statusCode !== 200) !== undefined ||
		response.some((e) => e.isError === true);

	const isLoading = response.some((e) => e.isLoading === true);

	const errorMessage = response.find((e) => e.data?.error !== null)?.data?.error;

	const data = response.map((responseOfQuery) =>
		responseOfQuery?.data?.payload?.result.map((e, index) => ({
			query: queryLength[index]?.query,
			queryData: e,
			legend: queryLength[index]?.legend,
		})),
	);

	const chartDataSet = useMemo(
		() =>
			getChartData({
				queryData: data.map((e) => ({
					query: e?.map((query) => query.query).join(' ') || '',
					queryData: e?.map((query) => query.queryData) || [],
					legend: e?.map((query) => query.legend).join('') || '',
				})),
			}),
		[data],
	);

	if (isLoading) {
		return <Spinner height="100%" size="large" tip="Loading..." />;
	}

	if (isError || data === undefined || data[0] === undefined) {
		return (
			<NotFoundContainer>
				<Typography>{errorMessage}</Typography>
			</NotFoundContainer>
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
					<Button
						onClick={(): void => {
							response.forEach((e) => e.refetch());
						}}
						type="primary"
					>
						Refresh
					</Button>
				</TimeContainer>
			)}

			<GridGraphComponent
				GRAPH_TYPES={widget.panelTypes}
				data={chartDataSet}
				isStacked={widget.isStacked}
				opacity={widget.opacity}
				title={widget.title}
				onClickHandler={onClickHandler}
				name={name}
				yAxisUnit={yAxisUnit}
				onDragSelect={onDragSelect}
			/>
		</>
	);
}

interface FullViewProps {
	widget: PromQLWidgets;
	fullViewOptions?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	onDragSelect?: (start: number, end: number) => void;
}

FullView.defaultProps = {
	fullViewOptions: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
	onDragSelect: undefined,
};

export default FullView;
