/* eslint-disable react/no-unstable-nested-components */
import { PlusOutlined, SaveFilled } from '@ant-design/icons';
import { notification } from 'antd';
import updateDashboardApi from 'api/dashboard/update';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import useComponentPermission from 'hooks/useComponentPermission';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	ToggleAddWidget,
	ToggleAddWidgetProps,
} from 'store/actions/dashboard/toggleAddWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 } from 'uuid';

import AddWidget from './AddWidget';
import Graph from './Graph';
import {
	Button,
	ButtonContainer,
	Card,
	CardContainer,
	ReactGridLayout,
} from './styles';
import { updateDashboard } from './utils';

function GridGraph(props: Props): JSX.Element {
	const { toggleAddWidget } = props;

	const { dashboards, loading } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [saveLayoutState, setSaveLayoutState] = useState<State>({
		loading: false,
		error: false,
		errorMessage: '',
		payload: [],
	});

	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;
	const { widgets } = data;
	const [layouts, setLayout] = useState<LayoutProps[]>([]);

	const AddWidgetWrapper = useCallback(() => <AddWidget />, []);

	const isMounted = useRef(true);
	const isDeleted = useRef(false);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	const [saveLayout] = useComponentPermission(['save_layout'], role);

	const getPreLayouts: () => LayoutProps[] = useCallback(() => {
		if (widgets === undefined) {
			return [];
		}

		// when the layout is not present
		if (data.layout === undefined) {
			return widgets.map((e, index) => {
				return {
					h: 2,
					w: 6,
					y: Infinity,
					i: (index + 1).toString(),
					x: (index % 2) * 6,
					Component: (): JSX.Element => (
						<Graph
							name={`${e.id + index}non-expanded`}
							isDeleted={isDeleted}
							widget={widgets[index]}
							yAxisUnit={e.yAxisUnit}
						/>
					),
				};
			});
		}
		return data.layout
			.filter((_, index) => widgets[index])
			.map((e, index) => ({
				...e,
				Component: (): JSX.Element => {
					if (widgets[index]) {
						return (
							<Graph
								name={e.i + index}
								isDeleted={isDeleted}
								widget={widgets[index]}
								yAxisUnit={widgets[index].yAxisUnit}
							/>
						);
					}
					return <div />;
				},
			}));
	}, [widgets, data?.layout]);

	useEffect(() => {
		if (
			loading === false &&
			(isMounted.current === true || isDeleted.current === true)
		) {
			const preLayouts = getPreLayouts();
			setLayout(() => {
				return [...preLayouts];
			});
		}

		return (): void => {
			isMounted.current = false;
		};
	}, [widgets, layouts.length, AddWidgetWrapper, loading, getPreLayouts]);

	const onLayoutSaveHandler = useCallback(
		async (layout) => {
			setSaveLayoutState((state) => ({
				...state,
				error: false,
				errorMessage: '',
				loading: true,
			}));

			const response = await updateDashboardApi({
				data: {
					title: data.title,
					description: data.description,
					name: data.name,
					tags: data.tags,
					widgets: data.widgets,
					layout,
				},
				uuid: selectedDashboard.uuid,
			});
			if (response.statusCode === 200) {
				setSaveLayoutState((state) => ({
					...state,
					error: false,
					errorMessage: '',
					loading: false,
				}));
			} else {
				setSaveLayoutState((state) => ({
					...state,
					error: true,
					errorMessage: response.error || 'Something went wrong',
					loading: false,
				}));
			}
		},
		[
			data.description,
			data.name,
			data.tags,
			data.title,
			data.widgets,
			selectedDashboard.uuid,
		],
	);

	const onDropHandler = useCallback(
		async (allLayouts: Layout[], currentLayout: Layout, event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer) {
				try {
					const graphType = event.dataTransfer.getData('text') as GRAPH_TYPES;
					const generateWidgetId = v4();

					await Promise.all([
						updateDashboard({
							data,
							generateWidgetId,
							graphType,
							selectedDashboard,
							layout: allLayouts.map((e) => ({
								...e,
								i: e.i,
								w: e.w,
								h: e.h,
							})),
						}),
					]);
				} catch (error) {
					notification.error({
						message:
							error instanceof Error ? error.toString() : 'Something went wrong',
					});
				}
			}
		},
		[data, selectedDashboard],
	);

	const onLayoutChangeHandler = async (layout: Layout[]): Promise<void> => {
		setSaveLayoutState({
			loading: false,
			error: false,
			errorMessage: '',
			payload: layout,
		});

		await onLayoutSaveHandler(layout);
	};

	return (
		<>
			<ButtonContainer>
				{saveLayout && (
					<Button
						loading={saveLayoutState.loading}
						onClick={onLayoutSaveHandler}
						icon={<SaveFilled />}
						danger={saveLayoutState.error}
					>
						Save Layout
					</Button>
				)}

				<Button
					onClick={(): void => {
						toggleAddWidget(true);
					}}
					icon={<PlusOutlined />}
				>
					Add Panel
				</Button>
			</ButtonContainer>

			<ReactGridLayout
				isResizable
				isDraggable
				cols={12}
				rowHeight={100}
				autoSize
				width={100}
				isDroppable
				useCSSTransforms
				onDrop={onDropHandler}
				allowOverlap={false}
				onLayoutChange={onLayoutChangeHandler}
			>
				{layouts.map(({ Component, ...rest }, index) => {
					const widget = (widgets || [])[index] || {};

					const type = widget?.panelTypes || 'TIME_SERIES';

					const isQueryType = type === 'VALUE';

					return (
						<CardContainer
							isQueryType={isQueryType}
							isDarkMode={isDarkMode}
							key={widget.id}
							data-grid={rest}
						>
							<Card isDarkMode={isDarkMode} isQueryType={isQueryType}>
								<Component />
							</Card>
						</CardContainer>
					);
				})}
			</ReactGridLayout>
		</>
	);
}

interface LayoutProps extends Layout {
	Component: () => JSX.Element;
}

interface State {
	loading: boolean;
	error: boolean;
	payload: Layout[];
	errorMessage: string;
}

interface DispatchProps {
	toggleAddWidget: (
		props: ToggleAddWidgetProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleAddWidget: bindActionCreators(ToggleAddWidget, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(memo(GridGraph));
