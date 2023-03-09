import { Typography } from 'antd';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import usePreviousValue from 'hooks/usePreviousValue';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import getChartData from 'lib/getChartData';
import isEmpty from 'lodash-es/isEmpty';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useInView } from 'react-intersection-observer';
import { useQuery } from 'react-query';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	DeleteWidget,
	DeleteWidgetProps,
} from 'store/actions/dashboard/deleteWidget';
import { GetMetricQueryRange } from 'store/actions/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';
import { GlobalReducer } from 'types/reducer/globalTime';

import { LayoutProps } from '..';
import EmptyWidget from '../EmptyWidget';
import WidgetHeader from '../WidgetHeader';
import FullView from './FullView/index.metricsBuilder';
import { FullViewContainer, Modal } from './styles';

function GridCardGraph({
	widget,
	deleteWidget,
	name,
	yAxisUnit,
	layout = [],
	setLayout,
	onDragSelect,
}: GridCardGraphProps): JSX.Element {
	const { ref: graphRef, inView: isGraphVisible } = useInView({
		threshold: 0,
		triggerOnce: true,
		initialInView: true,
	});

	const [errorMessage, setErrorMessage] = useState<string | undefined>('');
	const [hovered, setHovered] = useState(false);
	const [modal, setModal] = useState(false);
	const [deleteModal, setDeleteModal] = useState(false);

	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;
	const selectedData = selectedDashboard?.data;
	const { variables } = selectedData;

	const queryResponse = useQuery(
		[
			`GetMetricsQueryRange-${widget?.timePreferance}-${globalSelectedInterval}-${widget.id}`,
			{
				widget,
				maxTime,
				minTime,
				globalSelectedInterval,
				variables,
			},
		],
		() =>
			GetMetricQueryRange({
				selectedTime: widget?.timePreferance,
				graphType: widget.panelTypes,
				query: widget.query,
				globalSelectedInterval,
				variables: getDashboardVariables(),
			}),
		{
			keepPreviousData: true,
			enabled: isGraphVisible,
			refetchOnMount: false,
			onError: (error) => {
				if (error instanceof Error) {
					setErrorMessage(error.message);
				}
			},
		},
	);

	const chartData = useMemo(
		() =>
			getChartData({
				queryData: [
					{
						queryData: queryResponse?.data?.payload?.data?.result || [],
					},
				],
			}),
		[queryResponse],
	);

	const prevChartDataSetRef = usePreviousValue<ChartData>(chartData);

	const onToggleModal = useCallback(
		(func: React.Dispatch<React.SetStateAction<boolean>>) => {
			func((value) => !value);
		},
		[],
	);

	const onDeleteHandler = useCallback(() => {
		const isEmptyWidget = widget?.id === 'empty' || isEmpty(widget);

		const widgetId = isEmptyWidget ? layout[0].i : widget?.id;

		deleteWidget({ widgetId, setLayout });
		onToggleModal(setDeleteModal);
	}, [deleteWidget, layout, onToggleModal, setLayout, widget]);

	const getModals = (): JSX.Element => (
		<>
			<Modal
				destroyOnClose
				onCancel={(): void => onToggleModal(setDeleteModal)}
				open={deleteModal}
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
				open={modal}
				onCancel={(): void => onToggleModal(setModal)}
				width="85%"
				destroyOnClose
			>
				<FullViewContainer>
					<FullView name={`${name}expanded`} widget={widget} yAxisUnit={yAxisUnit} />
				</FullViewContainer>
			</Modal>
		</>
	);

	const handleOnView = (): void => {
		onToggleModal(setModal);
	};

	const handleOnDelete = (): void => {
		onToggleModal(setDeleteModal);
	};

	const isEmptyLayout = widget?.id === 'empty' || isEmpty(widget);

	if (queryResponse.isError && !isEmptyLayout) {
		return (
			<span ref={graphRef}>
				{getModals()}
				{!isEmpty(widget) && prevChartDataSetRef && (
					<>
						<div className="drag-handle">
							<WidgetHeader
								parentHover={hovered}
								title={widget?.title}
								widget={widget}
								onView={handleOnView}
								onDelete={handleOnDelete}
								queryResponse={queryResponse}
								errorMessage={errorMessage}
							/>
						</div>
						<GridGraphComponent
							GRAPH_TYPES={widget.panelTypes}
							data={prevChartDataSetRef}
							isStacked={widget.isStacked}
							opacity={widget.opacity}
							title={' '}
							name={name}
							yAxisUnit={yAxisUnit}
						/>
					</>
				)}
			</span>
		);
	}

	if (prevChartDataSetRef?.labels === undefined && queryResponse.isLoading) {
		return (
			<span ref={graphRef}>
				{!isEmpty(widget) && prevChartDataSetRef?.labels ? (
					<>
						<div className="drag-handle">
							<WidgetHeader
								parentHover={hovered}
								title={widget?.title}
								widget={widget}
								onView={handleOnView}
								onDelete={handleOnDelete}
								queryResponse={queryResponse}
								errorMessage={errorMessage}
							/>
						</div>
						<GridGraphComponent
							GRAPH_TYPES={widget.panelTypes}
							data={prevChartDataSetRef}
							isStacked={widget.isStacked}
							opacity={widget.opacity}
							title={' '}
							name={name}
							yAxisUnit={yAxisUnit}
						/>
					</>
				) : (
					<Spinner height="20vh" tip="Loading..." />
				)}
			</span>
		);
	}

	return (
		<span
			ref={graphRef}
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
			{!isEmptyLayout && (
				<div className="drag-handle">
					<WidgetHeader
						parentHover={hovered}
						title={widget?.title}
						widget={widget}
						onView={handleOnView}
						onDelete={handleOnDelete}
						queryResponse={queryResponse}
						errorMessage={errorMessage}
					/>
				</div>
			)}

			{!isEmptyLayout && getModals()}

			{!isEmpty(widget) && !!queryResponse.data?.payload && (
				<GridGraphComponent
					GRAPH_TYPES={widget.panelTypes}
					data={chartData}
					isStacked={widget.isStacked}
					opacity={widget.opacity}
					title={' '} // `empty title to accommodate absolutely positioned widget header
					name={name}
					yAxisUnit={yAxisUnit}
					onDragSelect={onDragSelect}
				/>
			)}

			{isEmptyLayout && <EmptyWidget />}
		</span>
	);
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
	// eslint-disable-next-line react/require-default-props
	setLayout?: React.Dispatch<React.SetStateAction<LayoutProps[]>>;
	onDragSelect?: (start: number, end: number) => void;
}

GridCardGraph.defaultProps = {
	onDragSelect: undefined,
};

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(GridCardGraph));
