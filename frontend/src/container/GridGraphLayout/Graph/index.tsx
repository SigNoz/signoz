import { Typography } from 'antd';
import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import React, { useCallback, useEffect, useState } from 'react';
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

import useQuery from '../utils/useQuery';
import Bar from './Bar';
import FullView from './FullView';
import { ErrorContainer, FullViewContainer, Modal } from './styles';

function GridCardGraph({
	widget,
	deleteWidget,
	isDeleted,
	name,
	yAxisUnit,
}: GridCardGraphProps): JSX.Element {
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
			const graphData = await useQuery(widget, minTime, maxTime); // eslint-disable-line react-hooks/rules-of-hooks
			setState((state) => ({
				...state,
				...graphData,
			}));
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
		// eslint-disable-next-line no-param-reassign
		isDeleted.current = true;
	}, [deleteWidget, widget, onToggleModal, isDeleted]);

	const getModals = (): JSX.Element => {
		return (
			<>
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
				<Bar
					onViewFullScreenHandler={(): void => onToggleModal(setModal)}
					widget={widget}
					onDeleteHandler={(): void => onToggleModal(setDeletModal)}
				/>

				<ErrorContainer>{state.errorMessage}</ErrorContainer>
			</>
		);
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

			{getModals()}

			<GridGraphComponent
				{...{
					GRAPH_TYPES: widget.panelTypes,
					data: state.payload,
					isStacked: widget.isStacked,
					opacity: widget.opacity,
					title: widget.title,
					name,
					yAxisUnit,
				}}
			/>
		</>
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
	isDeleted: React.MutableRefObject<boolean>;
	name: string;
	yAxisUnit: string | undefined;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(null, mapDispatchToProps)(GridCardGraph);
