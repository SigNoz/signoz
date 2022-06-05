import { Typography } from 'antd';
import getQueryResult from 'api/widgets/getQuery';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import getChartData from 'lib/getChartData';
import GetMaxMinTime from 'lib/getMaxMinTime';
import GetStartAndEndTime from 'lib/getStartAndEndTime';
import isEmpty from 'lodash-es/isEmpty';
import React, { memo, useCallback, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useQueries } from 'react-query';
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

import { LayoutProps } from '..';
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
	setLayout,
}: GridCardGraphProps): JSX.Element {
	const [hovered, setHovered] = useState(false);
	const [modal, setModal] = useState(false);
	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);
	const [deleteModal, setDeleteModal] = useState(false);

	const getMaxMinTime = GetMaxMinTime({
		graphType: widget?.panelTypes,
		maxTime,
		minTime,
	});

	const { start, end } = GetStartAndEndTime({
		type: widget?.timePreferance,
		maxTime: getMaxMinTime.maxTime,
		minTime: getMaxMinTime.minTime,
	});

	const queryLength = widget?.query?.filter((e) => e.query.length !== 0) || [];

	const response = useQueries(
		queryLength?.map((query) => {
			return {
				// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
				queryFn: () => {
					return getQueryResult({
						end,
						query: query?.query,
						start,
						step: '60',
					});
				},
				queryHash: `${query?.query}-${query?.legend}-${start}-${end}`,
				retryOnMount: false,
			};
		}),
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

	if (isLoading) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

	if (
		(isError || data === undefined || data[0] === undefined) &&
		!isEmptyLayout
	) {
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

				<ErrorContainer>{errorMessage}</ErrorContainer>
			</>
		);
	}

	const chartData = getChartData({
		queryData: data.map((e) => ({
			query: e?.map((e) => e.query).join(' ') || '',
			queryData: e?.map((e) => e.queryData) || [],
			legend: e?.map((e) => e.legend).join('') || '',
		})),
	});

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
						data: chartData,
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
