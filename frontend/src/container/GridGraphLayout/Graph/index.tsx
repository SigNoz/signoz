import { Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import getChartData from 'lib/getChartData';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTime } from 'store/actions';
import {
	DeleteWidget,
	DeleteWidgetProps,
} from 'store/actions/dashboard/deleteWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';

import Bar from './Bar';
import FullView from './FullView';
import { Modal } from './styles';

const GridCardGraph = ({
	widget,
	deleteWidget,
}: GridCardGraphProps): JSX.Element => {
	const [state, setState] = useState<GridCardGraphState>({
		loading: true,
		errorMessage: '',
		error: false,
		payload: undefined,
	});
	const [modal, setModal] = useState(false);
	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);
	const [deleteModal, setDeletModal] = useState(false);

	const counter = useRef(0);
	const isUnmounted = useRef(false);
	const { start, end } = GetStartAndEndTime({
		type: widget.timePreferance,
		maxTime,
		minTime,
	});

	useEffect(() => {
		(async (): Promise<void> => {
			try {
				if (counter.current === 0 && isUnmounted.current === false) {
					counter.current = 1;
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

		return (): void => {
			isUnmounted.current = true;
		};
	}, [widget, state, end, start]);

	const onToggleModal = useCallback(
		(func: React.Dispatch<React.SetStateAction<boolean>>) => {
			func((value) => !value);
		},
		[],
	);

	const onDeleteHandler = useCallback(() => {
		deleteWidget({ widgetId: widget.id });
		onToggleModal(setDeletModal);
	}, [deleteWidget, widget, onToggleModal]);

	if (state.error) {
		return <div>{state.errorMessage}</div>;
	}

	if (state.loading === true || state.payload === undefined) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

	return (
		<>
			<Bar
				onViewFullScreenHandler={(): void => onToggleModal(setModal)}
				widget={widget}
				onDeleteHandler={(): void => onToggleModal(setDeletModal)}
			/>

			<Modal
				destroyOnClose
				onCancel={(): void => onToggleModal(setDeletModal)}
				visible={deleteModal}
				title="Delete"
				height="10vh"
				onOk={onDeleteHandler}
				centered
			>
				<Typography>Are you sure you want to delete this widget</Typography>
			</Modal>

			<Modal
				title="View"
				footer={[]}
				centered
				visible={modal}
				onCancel={(): void => onToggleModal(setModal)}
				width="85%"
				destroyOnClose
			>
				<FullView widget={widget} />
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

interface GridCardGraphState {
	loading: boolean;
	error: boolean;
	errorMessage: string;
	payload: ChartData | undefined;
}

interface DispatchProps {
	deleteWidget: ({
		widgetId,
	}: DeleteWidgetProps) => (dispatch: Dispatch<AppActions>) => void;
}

interface GridCardGraphProps extends DispatchProps {
	widget: Widgets;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(null, mapDispatchToProps)(GridCardGraph);
