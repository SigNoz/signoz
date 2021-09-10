import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import getChartData from 'lib/getChartData';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { GlobalTime } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';

import Bar from './Bar';
import { Modal } from './styles';

const GridCardGraph = ({ widget }: GridCardGraphProps): JSX.Element => {
	const [state, setState] = useState<GridCardGraphState>({
		loading: false,
		errorMessage: '',
		error: false,
		payload: undefined,
	});
	const [modal, setModal] = useState(false);
	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);

	const counter = useRef(0);

	const { start, end } = GetStartAndEndTime({
		type: widget.timePreferance,
		maxTime,
		minTime,
	});

	useEffect(() => {
		(async (): Promise<void> => {
			try {
				if (counter.current === 0) {
					counter.current = 1;
					setState({
						...state,
						loading: true,
					});

					const response = await Promise.all(
						widget.query.map(async (query) => {
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
							query: widget.query,
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
	}, [widget, state, end, start]);

	const onToggleModal = useCallback(() => {
		setModal((state) => !state);
	}, []);

	if (state.error) {
		return <div>{state.errorMessage}</div>;
	}

	if (state.loading === true || state.payload === undefined) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

	return (
		<>
			<Bar onToggleModal={onToggleModal} widget={widget} />

			<Modal
				title="View"
				footer={[]}
				centered
				visible={modal}
				onCancel={onToggleModal}
				width="60%"
				destroyOnClose
			>
				<GridGraphComponent
					{...{
						GRAPH_TYPES: widget.panelTypes,
						data: state.payload,
						isStacked: widget.isStacked,
						opacity: widget.opacity,
						title: widget.title,
					}}
				/>
			</Modal>

			<GridGraphComponent
				{...{
					GRAPH_TYPES: widget.panelTypes,
					data: state.payload,
					isStacked: widget.isStacked,
					opacity: widget.opacity,
					title: widget.title,
				}}
			/>
		</>
	);
};

interface GridCardGraphProps {
	widget: Widgets;
}

interface GridCardGraphState {
	loading: boolean;
	error: boolean;
	errorMessage: string;
	payload: ChartData | undefined;
}

export default GridCardGraph;
