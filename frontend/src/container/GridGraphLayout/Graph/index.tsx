import { Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import getChartData from 'lib/getChartData';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import isEmpty from 'lodash-es/isEmpty';
import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { connect, useSelector } from 'react-redux';
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

import EmptyWidget from '../EmptyWidget';
import WidgetHeader from '../WidgetHeader';
import FullView from './FullView';
import { ErrorContainer, FullViewContainer, Modal } from './styles';

function GridCardGraph({
	widget,
	deleteWidget,
	name,
	yAxisUnit,
	layout = [],
}: GridCardGraphProps): JSX.Element {
	const [state, setState] = useState<GridCardGraphState>({
		loading: true,
		errorMessage: '',
		error: false,
		payload: undefined,
	});
	const [hovered, setHovered] = useState(false);
	const [modal, setModal] = useState(false);
	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);
	const [deleteModal, setDeleteModal] = useState(false);

	useEffect(() => {
		(async (): Promise<void> => {
			if (!isEmpty(widget)) {
				try {
					const getMaxMinTime = GetMaxMinTime({
						graphType: widget?.panelTypes,
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
									query: encodeURIComponent(query.query),
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
						setState((state) => ({
							...state,
							error: true,
							errorMessage: isError.queryData.error || 'Something went wrong',
							loading: false,
						}));
					} else {
						const chartDataSet = getChartData({
							queryData: response.map((e) => ({
								query: e.query,
								legend: e.legend,
								queryData: e.queryData.payload?.result || [],
							})),
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
			} else {
				setState((state) => ({
					...state,
					loading: false,
					payload: { datasets: [], labels: [] },
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
		const isEmptyWidget = layout.find((e) => e.i === 'empty') !== undefined;

		const widgetId = isEmptyWidget ? layout[0].i : widget.id;
		const allLayout = isEmptyWidget ? [] : layout;

		console.log(widgetId, allLayout);

		deleteWidget({ widgetId, layout: allLayout });
		onToggleModal(setDeleteModal);
	}, [deleteWidget, layout, onToggleModal, widget?.id]);

	const getModals = (): JSX.Element => {
		return (
			<>
				<Modal
					destroyOnClose
					onCancel={(): void => onToggleModal(setDeleteModal)}
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
					<FullViewContainer>
						<FullView
							name={`${name}expanded`}
							widget={widget}
							yAxisUnit={yAxisUnit}
						/>
					</FullViewContainer>
				</Modal>
			</>
		);
	};

	if (state.error) {
		return (
			<>
				{getModals()}
				<WidgetHeader
					parentHover={hovered}
					title={widget?.title}
					widget={widget}
					onView={(): void => onToggleModal(setModal)}
					onDelete={(): void => onToggleModal(setDeleteModal)}
				/>

				<ErrorContainer>{state.errorMessage}</ErrorContainer>
			</>
		);
	}

	if (state.loading === true || state.payload === undefined) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

	const isEmptyLayout = layout.find((e) => e.i === 'empty') !== undefined;

	return (
		<span
			onMouseOver={(): void => {
				setHovered(true);
			}}
			onFocus={(): void => {
				setHovered(true);
			}}
			onMouseOut={(): void => {
				setHovered(false);
			}}
			onBlur={(): void => {
				setHovered(false);
			}}
		>
			<WidgetHeader
				parentHover={hovered}
				title={widget?.title}
				widget={widget}
				onView={(): void => onToggleModal(setModal)}
				onDelete={(): void => onToggleModal(setDeleteModal)}
			/>

			{getModals()}

			{!isEmpty(widget) && (
				<GridGraphComponent
					{...{
						GRAPH_TYPES: widget.panelTypes,
						data: state.payload,
						isStacked: widget.isStacked,
						opacity: widget.opacity,
						title: ' ', // empty title to accommodate absolutely positioned widget header
						name,
						yAxisUnit,
					}}
				/>
			)}

			{isEmptyLayout && <EmptyWidget />}
		</span>
	);
}

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
	name: string;
	yAxisUnit: string | undefined;
	// eslint-disable-next-line react/require-default-props
	layout?: Layout[];
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(null, mapDispatchToProps)(GridCardGraph);
