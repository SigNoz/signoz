import { Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import getChartData from 'lib/getChartData';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	DeleteWidget,
	DeleteWidgetProps,
} from 'store/actions/dashboard/deleteWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';

import Bar from './Bar';
import FullView from './FullView';
import { Modal } from './styles';

const GridCardGraph = ({
	widget,
	deleteWidget,
	isDeleted,
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

	useEffect(() => {
		(async (): Promise<void> => {
			try {
				const getMaxMinTime = GetMaxMinTime({
					graphType: widget.panelTypes,
					maxTime,
					minTime,
				});

				const { start, end } = GetStartAndEndTime({
					type: widget.timePreferance,
					maxTime: getMaxMinTime.maxTime,
					minTime: getMaxMinTime.minTime,
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
		})();
	}, [widget, maxTime, minTime]);

	const onToggleModal = useCallback(
		(func: React.Dispatch<React.SetStateAction<boolean>>) => {
			func((value) => !value);
		},
		[],
	);

	const onDeleteHandler = useCallback(() => {
		deleteWidget({ widgetId: widget.id });
		onToggleModal(setDeletModal);
		isDeleted.current = true;
	}, [deleteWidget, widget, onToggleModal, isDeleted]);

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
	isDeleted: React.MutableRefObject<boolean>;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(null, mapDispatchToProps)(GridCardGraph);
