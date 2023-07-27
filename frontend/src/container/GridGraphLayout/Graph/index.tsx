import { Typography } from 'antd';
import { ChartData } from 'chart.js';
import { GraphOnClickHandler } from 'components/Graph';
import Spinner from 'components/Spinner';
import { UpdateDashboard } from 'container/GridGraphLayout/utils';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { useNotifications } from 'hooks/useNotifications';
import usePreviousValue from 'hooks/usePreviousValue';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import getChartData from 'lib/getChartData';
import history from 'lib/history';
import isEmpty from 'lodash-es/isEmpty';
import {
	Dispatch,
	memo,
	SetStateAction,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	DeleteWidget,
	DeleteWidgetProps,
} from 'store/actions/dashboard/deleteWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';
import { GlobalReducer } from 'types/reducer/globalTime';
import {
	getSelectedDashboard,
	getSelectedDashboardVariable,
} from 'utils/dashboard/selectedDashboard';
import { v4 } from 'uuid';

import { LayoutProps } from '..';
import EmptyWidget from '../EmptyWidget';
import WidgetHeader from '../WidgetHeader';
import FullView from './FullView';
import { FullViewContainer, Modal } from './styles';

function GridCardGraph({
	widget,
	deleteWidget,
	name,
	yAxisUnit,
	layout = [],
	setLayout,
	onDragSelect,
	onClickHandler,
	allowDelete,
	allowClone,
	allowEdit,
	isQueryEnabled,
}: GridCardGraphProps): JSX.Element {
	const { ref: graphRef, inView: isGraphVisible } = useInView({
		threshold: 0,
		triggerOnce: true,
		initialInView: false,
	});

	const { notifications } = useNotifications();

	const { t } = useTranslation(['common']);

	const [errorMessage, setErrorMessage] = useState<string | undefined>('');
	const [hovered, setHovered] = useState(false);
	const [modal, setModal] = useState(false);
	const [deleteModal, setDeleteModal] = useState(false);

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const selectedDashboard = getSelectedDashboard(dashboards);
	const variables = getSelectedDashboardVariable(dashboards);

	const updatedQuery = useStepInterval(widget?.query);

	const isEmptyWidget = useMemo(
		() => widget?.id === 'empty' || isEmpty(widget),
		[widget],
	);

	const queryResponse = useGetQueryRange(
		{
			selectedTime: widget?.timePreferance,
			graphType: widget?.panelTypes,
			query: updatedQuery,
			globalSelectedInterval,
			variables: getDashboardVariables(),
		},
		{
			queryKey: [
				`GetMetricsQueryRange-${widget?.timePreferance}-${globalSelectedInterval}-${widget?.id}`,
				widget,
				maxTime,
				minTime,
				globalSelectedInterval,
				variables,
			],
			keepPreviousData: true,
			enabled: isGraphVisible && !isEmptyWidget && isQueryEnabled,
			refetchOnMount: false,
			onError: (error) => {
				setErrorMessage(error.message);
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
		(func: Dispatch<SetStateAction<boolean>>) => {
			func((value) => !value);
		},
		[],
	);

	const onDeleteHandler = useCallback(() => {
		const widgetId = isEmptyWidget ? layout[0].i : widget?.id;

		featureResponse
			.refetch()
			.then(() => {
				deleteWidget({ widgetId, setLayout });
				onToggleModal(setDeleteModal);
			})
			.catch(() => {
				notifications.error({
					message: t('common:something_went_wrong'),
				});
			});
	}, [
		isEmptyWidget,
		widget?.id,
		layout,
		featureResponse,
		deleteWidget,
		setLayout,
		onToggleModal,
		notifications,
		t,
	]);

	const onCloneHandler = async (): Promise<void> => {
		const uuid = v4();

		const layout = [
			{
				i: uuid,
				w: 6,
				x: 0,
				h: 2,
				y: 0,
			},
			...(selectedDashboard?.data.layout || []),
		];

		if (widget && selectedDashboard) {
			await UpdateDashboard(
				{
					data: selectedDashboard.data,
					generateWidgetId: uuid,
					graphType: widget?.panelTypes,
					selectedDashboard,
					layout,
					widgetData: widget,
					isRedirected: false,
				},
				notifications,
			).then(() => {
				notifications.success({
					message: 'Panel cloned successfully, redirecting to new copy.',
				});

				setTimeout(() => {
					history.push(
						`${history.location.pathname}/new?graphType=${widget?.panelTypes}&widgetId=${uuid}`,
					);
				}, 1500);
			});
		}
	};

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
								onClone={onCloneHandler}
								queryResponse={queryResponse}
								errorMessage={errorMessage}
								allowClone={allowClone}
								allowDelete={allowDelete}
								allowEdit={allowEdit}
							/>
						</div>
						<GridPanelSwitch
							panelType={widget?.panelTypes}
							data={prevChartDataSetRef}
							isStacked={widget?.isStacked}
							opacity={widget?.opacity}
							title={' '}
							name={name}
							yAxisUnit={yAxisUnit}
							onClickHandler={onClickHandler}
							panelData={[]}
							query={widget.query}
						/>
					</>
				)}
			</span>
		);
	}

	if (queryResponse.status === 'loading' || queryResponse.status === 'idle') {
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
								onClone={onCloneHandler}
								queryResponse={queryResponse}
								errorMessage={errorMessage}
								allowClone={allowClone}
								allowDelete={allowDelete}
								allowEdit={allowEdit}
							/>
						</div>
						<GridPanelSwitch
							panelType={widget.panelTypes}
							data={prevChartDataSetRef}
							isStacked={widget.isStacked}
							opacity={widget.opacity}
							title={' '}
							name={name}
							yAxisUnit={yAxisUnit}
							onClickHandler={onClickHandler}
							panelData={[]}
							query={widget.query}
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
						onClone={onCloneHandler}
						queryResponse={queryResponse}
						errorMessage={errorMessage}
						allowClone={allowClone}
						allowDelete={allowDelete}
						allowEdit={allowEdit}
					/>
				</div>
			)}

			{!isEmptyLayout && getModals()}

			{!isEmpty(widget) && !!queryResponse.data?.payload && (
				<GridPanelSwitch
					panelType={widget.panelTypes}
					data={chartData}
					isStacked={widget.isStacked}
					opacity={widget.opacity}
					title={' '} // `empty title to accommodate absolutely positioned widget header
					name={name}
					yAxisUnit={yAxisUnit}
					onDragSelect={onDragSelect}
					onClickHandler={onClickHandler}
					panelData={queryResponse.data?.payload.data.newResult.data.result || []}
					query={widget.query}
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
	setLayout?: Dispatch<SetStateAction<LayoutProps[]>>;
	onDragSelect?: (start: number, end: number) => void;
	onClickHandler?: GraphOnClickHandler;
	allowDelete?: boolean;
	allowClone?: boolean;
	allowEdit?: boolean;
	isQueryEnabled?: boolean;
}

GridCardGraph.defaultProps = {
	onDragSelect: undefined,
	onClickHandler: undefined,
	allowDelete: true,
	allowClone: true,
	allowEdit: true,
	isQueryEnabled: true,
};

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(GridCardGraph));
