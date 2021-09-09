import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import getChartData from 'lib/getChartData';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useEffect, useRef, useState } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';

const GridCardGraph = ({ widgets }: GridCardGraphProps): JSX.Element => {
	const [state, setState] = useState<GridCardGraphState>({
		loading: false,
		errorMessage: '',
		error: false,
		payload: undefined,
	});

	const counter = useRef(0);

	useEffect(() => {
		(async (): Promise<void> => {
			try {
				if (counter.current === 0) {
					counter.current = 1;
					setState({
						...state,
						loading: true,
					});
					const { start, end } = getStartAndEndTime({
						type: widgets.timePreferance,
					});

					const response = await Promise.all(
						widgets.query.map(async (query) => {
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
						setState({
							...state,
							error: true,
							errorMessage: isError.error || 'Something went wrong',
							loading: false,
						});
					} else {
						const intialQuery: QueryData[] = [];

						const finalQueryData: QueryData[] = response.reduce((acc, current) => {
							return [...acc, ...(current.payload?.result || [])];
						}, intialQuery);

						const chartDataSet = getChartData({
							query: widgets.query,
							queryData: {
								data: finalQueryData,
								error: false,
								errorMessage: '',
								loading: false,
							},
						});

						setState({
							...state,
							loading: false,
							payload: chartDataSet,
						});
					}
				}
			} catch (error) {
				setState({
					...state,
					error: true,
					errorMessage: (error as AxiosError).toString(),
					loading: false,
				});
			}
		})();
	}, [widgets, state]);

	if (state.error) {
		return <div>{state.errorMessage}</div>;
	}

	if (state.loading === true || state.payload === undefined) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

	return (
		<GridGraphComponent
			{...{
				GRAPH_TYPES: widgets.panelTypes,
				data: state.payload,
				isStacked: widgets.isStacked,
				opacity: widgets.opacity,
				title: widgets.title,
			}}
		/>
	);
};

interface GridCardGraphProps {
	widgets: Widgets;
}

interface GridCardGraphState {
	loading: boolean;
	error: boolean;
	errorMessage: string;
	payload: ChartData | undefined;
}

export default GridCardGraph;
