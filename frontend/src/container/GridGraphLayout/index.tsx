/* eslint-disable react/no-unstable-nested-components */

import updateDashboardApi from 'api/dashboard/update';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch as ReduxDispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { AppDispatch } from 'store';
import { UpdateTimeInterval } from 'store/actions';
import {
	ToggleAddWidget,
	ToggleAddWidgetProps,
} from 'store/actions/dashboard/toggleAddWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_DASHBOARD } from 'types/actions/dashboard';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';

import Graph from './Graph';
import GraphLayoutContainer from './GraphLayout';
import { UpdateDashboard } from './utils';

export const getPreLayouts = (
	widgets: Widgets[] | undefined,
	layout: Layout[],
): LayoutProps[] =>
	layout.map((e, index) => ({
		...e,
		Component: ({ setLayout }: ComponentProps): JSX.Element => {
			const widget = widgets?.find((widget) => widget.id === e.i);

			return (
				<Graph
					name={e.i + index}
					widget={widget as Widgets}
					yAxisUnit={widget?.yAxisUnit}
					layout={layout}
					setLayout={setLayout}
				/>
			);
		},
	}));

function GridGraph(props: Props): JSX.Element {
	const { toggleAddWidget } = props;
	const [addPanelLoading, setAddPanelLoading] = useState(false);
	const { t } = useTranslation(['common']);
	const { dashboards, isAddWidget } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [saveLayoutPermission] = useComponentPermission(['save_layout'], role);
	const [saveLayoutState, setSaveLayoutState] = useState<State>({
		loading: false,
		error: false,
		errorMessage: '',
		payload: [],
	});
	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;
	const { widgets } = data;
	const dispatch: AppDispatch = useDispatch<ReduxDispatch<AppActions>>();

	const [layouts, setLayout] = useState<LayoutProps[]>(
		getPreLayouts(widgets, selectedDashboard.data.layout || []),
	);

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch],
	);

	const { notifications } = useNotifications();

	useEffect(() => {
		(async (): Promise<void> => {
			if (!isAddWidget) {
				const isEmptyLayoutPresent = layouts.find((e) => e.i === 'empty');
				if (isEmptyLayoutPresent) {
					// non empty layout
					const updatedLayout = layouts.filter((e) => e.i !== 'empty');
					// non widget
					const updatedWidget = widgets?.filter((e) => e.id !== 'empty');
					setLayout(updatedLayout);

					const updatedDashboard: Dashboard = {
						...selectedDashboard,
						data: {
							...selectedDashboard.data,
							layout: updatedLayout,
							widgets: updatedWidget,
						},
					};

					await updateDashboardApi({
						data: updatedDashboard.data,
						uuid: updatedDashboard.uuid,
					});

					dispatch({
						type: UPDATE_DASHBOARD,
						payload: updatedDashboard,
					});
				}
			}
		})();
	}, [dispatch, isAddWidget, layouts, selectedDashboard, widgets]);

	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const errorMessage = t('common:something_went_wrong');

	const onLayoutSaveHandler = useCallback(
		async (layout: Layout[]) => {
			try {
				setSaveLayoutState((state) => ({
					...state,
					error: false,
					errorMessage: '',
					loading: true,
				}));

				featureResponse
					.refetch()
					.then(async () => {
						const updatedDashboard: Dashboard = {
							...selectedDashboard,
							data: {
								title: data.title,
								description: data.description,
								name: data.name,
								tags: data.tags,
								widgets: data.widgets,
								variables: data.variables,
								layout,
							},
							uuid: selectedDashboard.uuid,
						};
						// Save layout only when users has the has the permission to do so.
						if (saveLayoutPermission) {
							const response = await updateDashboardApi(updatedDashboard);
							if (response.statusCode === 200) {
								setSaveLayoutState((state) => ({
									...state,
									error: false,
									errorMessage: '',
									loading: false,
								}));
								dispatch({
									type: UPDATE_DASHBOARD,
									payload: updatedDashboard,
								});
							} else {
								setSaveLayoutState((state) => ({
									...state,
									error: true,
									errorMessage: response.error || errorMessage,
									loading: false,
								}));
							}
						}
					})
					.catch(() => {
						setSaveLayoutState((state) => ({
							...state,
							error: true,
							errorMessage,
							loading: false,
						}));
						notifications.error({
							message: errorMessage,
						});
					});
			} catch (error) {
				notifications.error({
					message: errorMessage,
				});
			}
		},
		[
			data.description,
			data.name,
			data.tags,
			data.title,
			data.variables,
			data.widgets,
			dispatch,
			errorMessage,
			featureResponse,
			notifications,
			saveLayoutPermission,
			selectedDashboard,
		],
	);

	const setLayoutFunction = useCallback(
		(layout: Layout[]) => {
			setLayout(
				layout.map((e) => {
					const currentWidget =
						widgets?.find((widget) => widget.id === e.i) || ({} as Widgets);

					return {
						...e,
						Component: (): JSX.Element => (
							<Graph
								name={currentWidget.id}
								widget={currentWidget}
								yAxisUnit={currentWidget?.yAxisUnit}
								layout={layout}
								setLayout={setLayout}
								onDragSelect={onDragSelect}
							/>
						),
					};
				}),
			);
		},
		[widgets, onDragSelect],
	);

	const onEmptyWidgetHandler = useCallback(async () => {
		try {
			const id = 'empty';

			const layout = [
				{
					i: id,
					w: 6,
					x: 0,
					h: 2,
					y: 0,
				},
				...(data.layout || []),
			];

			await UpdateDashboard(
				{
					data,
					generateWidgetId: id,
					graphType: PANEL_TYPES.EMPTY_WIDGET,
					selectedDashboard,
					layout,
					isRedirected: false,
				},
				notifications,
			);

			setLayoutFunction(layout);
		} catch (error) {
			notifications.error({
				message: error instanceof Error ? error.toString() : errorMessage,
			});
		}
	}, [data, selectedDashboard, setLayoutFunction, notifications, errorMessage]);

	const onLayoutChangeHandler = async (layout: Layout[]): Promise<void> => {
		setLayoutFunction(layout);

		// await onLayoutSaveHandler(layout);
	};

	const onAddPanelHandler = useCallback(() => {
		try {
			setAddPanelLoading(true);
			featureResponse
				.refetch()
				.then(() => {
					const isEmptyLayoutPresent =
						layouts.find((e) => e.i === 'empty') !== undefined;

					if (!isEmptyLayoutPresent) {
						onEmptyWidgetHandler()
							.then(() => {
								setAddPanelLoading(false);
								toggleAddWidget(true);
							})
							.catch(() => {
								notifications.error({
									message: errorMessage,
								});
							});
					} else {
						toggleAddWidget(true);
						setAddPanelLoading(false);
					}
				})
				.catch(() =>
					notifications.error({
						message: errorMessage,
					}),
				);
		} catch (error) {
			notifications.error({
				message: errorMessage,
			});
		}
	}, [
		featureResponse,
		layouts,
		onEmptyWidgetHandler,
		toggleAddWidget,
		notifications,
		errorMessage,
	]);

	useEffect(
		() => (): void => {
			toggleAddWidget(false);
		},
		[toggleAddWidget],
	);

	return (
		<GraphLayoutContainer
			addPanelLoading={addPanelLoading}
			layouts={layouts}
			onAddPanelHandler={onAddPanelHandler}
			onLayoutChangeHandler={onLayoutChangeHandler}
			onLayoutSaveHandler={onLayoutSaveHandler}
			saveLayoutState={saveLayoutState}
			setLayout={setLayout}
			widgets={widgets}
		/>
	);
}

interface ComponentProps {
	setLayout: Dispatch<SetStateAction<LayoutProps[]>>;
}

export interface LayoutProps extends Layout {
	Component: (props: ComponentProps) => JSX.Element;
}

export interface State {
	loading: boolean;
	error: boolean;
	payload: Layout[];
	errorMessage: string;
}

interface DispatchProps {
	toggleAddWidget: (
		props: ToggleAddWidgetProps,
	) => (dispatch: ReduxDispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleAddWidget: bindActionCreators(ToggleAddWidget, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(GridGraph);
