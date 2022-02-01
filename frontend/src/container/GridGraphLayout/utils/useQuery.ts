import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import getChartData from 'lib/getChartData';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';

async function useQuery(
	widget: Widgets,
	minTime: GlobalTime['minTime'],
	maxTime: GlobalTime['maxTime'],
	globalMinMax?: GlobalMinMaxTime,
	selectedTime?: timePreferance,
): Promise<State> {
	let state: State = {
		loading: true,
		errorMessage: '',
		error: false,
		payload: undefined,
	};

	try {
		const getMaxMinTime = GetMaxMinTime({
			graphType: widget.panelTypes,
			maxTime,
			minTime,
		});

		let { start, end } = GetStartAndEndTime({
			type: selectedTime === undefined ? widget.timePreferance : selectedTime.enum,
			maxTime: getMaxMinTime.maxTime,
			minTime: getMaxMinTime.minTime,
		});

		if (globalMinMax !== undefined) {
			start = globalMinMax.min;
			end = globalMinMax.max;
		}

		const response = await Promise.all(
			widget.query
				.filter((e) => e.query.length !== 0)
				.map(async (query) => {
					const result = await getQueryResult({
						end,
						query: query.query,
						start,
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
			state = {
				...state,
				error: true,
				errorMessage: isError.queryData.error || 'Something went wrong',
				loading: false,
			};
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

			state = {
				...state,
				loading: false,
				payload: chartDataSet,
			};
		}
	} catch (error) {
		state = {
			...state,
			error: true,
			errorMessage: (error as AxiosError).toString(),
			loading: false,
		};
	}

	return {
		...state,
	};
}

interface GlobalMinMaxTime {
	min: string;
	max: string;
}

interface State {
	loading: boolean;
	error: boolean;
	errorMessage: string;
	payload: ChartData | undefined;
}

export default useQuery;
