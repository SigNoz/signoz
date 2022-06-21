import { Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import getChartData from 'lib/getChartData';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import isEmpty from 'lodash-es/isEmpty';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useQueries } from 'react-query';
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
import { GlobalReducer } from 'types/reducer/globalTime';

import { LayoutProps } from '..';
import EmptyWidget from '../EmptyWidget';
import WidgetHeader from '../WidgetHeader';
import FullView from './FullView/index.metricsBuilder';
import { ErrorContainer, FullViewContainer, Modal } from './styles';

function GridCardGraph({
	widget,
	deleteWidget,
	name,
	yAxisUnit,
	layout = [],
	setLayout,
}: GridCardGraphProps): JSX.Element {
	const [state, setState] = useState<GridCardGraphState>({
		loading: true,
		errorMessage: '',
		error: false,
		payload: undefined,
	});
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

	// const getMaxMinTime = GetMaxMinTime({
	// 	graphType: widget?.panelTypes,
	// 	maxTime,
	// 	minTime,
	// });

	// const { start, end } = GetStartAndEndTime({
	// 	type: widget?.timePreferance,
	// 	maxTime: getMaxMinTime.maxTime,
	// 	minTime: getMaxMinTime.minTime,
	// });

	// const queryLength = widget?.query?.filter((e) => e.query.length !== 0) || [];

	// const response = useQueries(
	// 	queryLength?.map((query) => {
	// 		return {
	// 			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	// 			queryFn: () => {
	// 				return getQueryResult({
	// 					end,
	// 					query: query?.query,
	// 					start,
	// 					step: '60',
	// 				});
	// 			},
	// 			queryHash: `${query?.query}-${query?.legend}-${start}-${end}`,
	// 			retryOnMount: false,
	// 		};
	// 	}),
	// );

	// const isError =
	// 	response.find((e) => e?.data?.statusCode !== 200) !== undefined ||
	// 	response.some((e) => e.isError === true);

	// const isLoading = response.some((e) => e.isLoading === true);

	// const errorMessage = response.find((e) => e.data?.error !== null)?.data?.error;

	// const data = response.map((responseOfQuery) =>
	// 	responseOfQuery?.data?.payload?.result.map((e, index) => ({
	// 		query: queryLength[index]?.query,
	// 		queryData: e,
	// 		legend: queryLength[index]?.legend,
	// 	})),
	// );

	useEffect(() => {
		(async (): Promise<void> => {
			try {
				const response = await GetMetricQueryRange({
					selectedTime: widget.timePreferance,
					graphType: widget.panelTypes,
					query: widget.query,
					globalSelectedInterval,
				});

				const isError = response.error;

				if (isError != null) {
					setState((state) => ({
						...state,
						error: true,
						errorMessage: isError.queryData.error || 'Something went wrong',
						loading: false,
					}));
				} else {
					const chartDataSet = getChartData({
						queryData: [
							{
								queryData: response.payload?.data?.result
									? response.payload?.data?.result
									: [],
							},
						],
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
	}, [widget, maxTime, minTime, globalSelectedInterval]);

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

	const isEmptyLayout = widget?.id === 'empty' || isEmpty(widget);

	if (state.error && !isEmptyLayout) {
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

	if (
		(state.loading === true || state.payload === undefined) &&
		!isEmptyLayout
	) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

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
			{!isEmptyLayout && (
				<WidgetHeader
					parentHover={hovered}
					title={widget?.title}
					widget={widget}
					onView={(): void => onToggleModal(setModal)}
					onDelete={(): void => onToggleModal(setDeleteModal)}
				/>
			)}

			{!isEmptyLayout && getModals()}

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
	// eslint-disable-next-line react/require-default-props
	setLayout?: React.Dispatch<React.SetStateAction<LayoutProps[]>>;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(GridCardGraph));
