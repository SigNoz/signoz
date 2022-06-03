/* eslint-disable react/no-unstable-nested-components */
import { notification } from 'antd';
import updateDashboardApi from 'api/dashboard/update';
import React, { memo, useCallback, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	ToggleAddWidget,
	ToggleAddWidgetProps,
} from 'store/actions/dashboard/toggleAddWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
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
	const { dashboards } = useSelector<AppState, DashboardReducer>(
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

	const [layouts, setLayout] = useState<LayoutProps[]>(
		getPreLayouts(widgets, selectedDashboard.data.layout || []),
	);

	const onLayoutSaveHandler = useCallback(
		async (layout: Layout[]) => {
			try {
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
			} catch (error) {
				console.error(error);
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

			await UpdateDashboard({
				data,
				generateWidgetId: id,
				graphType: 'EMPTY_WIDGET',
				selectedDashboard,
				layout,
				isRedirected: false,
			});

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
							/>
						),
					};
				}),
			);
		} catch (error) {
			notification.error({
				message: error instanceof Error ? error.toString() : 'Something went wrong',
			});
		}
	}, [data, selectedDashboard, widgets]);

	const onLayoutChangeHandler = async (layout: Layout[]): Promise<void> => {
		setSaveLayoutState({
			loading: false,
			error: false,
			errorMessage: '',
			payload: layout,
		});

		await onLayoutSaveHandler(layout);
	};

	const onAddPanelHandler = useCallback(() => {
		try {
			setAddPanelLoading(true);
			const isEmptyLayoutPresent =
				layouts.find((e) => e.i === 'empty') !== undefined;

			if (!isEmptyLayoutPresent) {
				onEmptyWidgetHandler()
					.then(() => {
						setAddPanelLoading(false);
						toggleAddWidget(true);
					})
					.catch(() => {
						notification.error(t('something_went_wrong'));
					});
			} else {
				toggleAddWidget(true);
				setAddPanelLoading(false);
			}
		} catch (error) {
			if (typeof error === 'string') {
				notification.error({
					message: error || t('something_went_wrong'),
				});
			}
		}
	}, [layouts, onEmptyWidgetHandler, t, toggleAddWidget]);

	return (
		<GraphLayoutContainer
			{...{
				addPanelLoading,
				layouts,
				onAddPanelHandler,
				onLayoutChangeHandler,
				onLayoutSaveHandler,
				saveLayoutState,
				widgets,
				setLayout,
			}}
		/>
	);
}

interface ComponentProps {
	setLayout: React.Dispatch<React.SetStateAction<LayoutProps[]>>;
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
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleAddWidget: bindActionCreators(ToggleAddWidget, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(memo(GridGraph));
