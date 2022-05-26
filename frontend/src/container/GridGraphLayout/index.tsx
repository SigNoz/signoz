/* eslint-disable react/no-unstable-nested-components */
import { SaveFilled } from '@ant-design/icons';
import { notification } from 'antd';
import updateDashboardApi from 'api/dashboard/update';
import Spinner from 'components/Spinner';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import useComponentPermission from 'hooks/useComponentPermission';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
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

function GridGraph(): JSX.Element {
	const { dashboards, loading } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
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

		return widgets.map((widget, index) => {
			const allLayouts = data?.layout;
			const lastLayout = (data?.layout || [])[(allLayouts?.length || 0) - 1];

			const currentLayout = (allLayouts || [])[index] || {
				h: lastLayout.h,
				i: (lastLayout.i + 1).toString(),
				w: lastLayout.w,
				x: (lastLayout.x % 2) * 6,
				y: lastLayout.y,
			};

			return {
				...currentLayout,
				Component: (): JSX.Element => (
					<Graph
						name={widget.id + index}
						isDeleted={isDeleted}
						widget={widget}
						yAxisUnit={widget.yAxisUnit}
					/>
				),
			};
		});
	}, [widgets, data.layout]);

	useEffect(() => {
		if (
			loading === false &&
			(isMounted.current === true || isDeleted.current === true)
		) {
			const preLayouts = getPreLayouts();
			setLayout(() => {
				const getX = (): number => {
					if (preLayouts && preLayouts?.length > 0) {
						const last = preLayouts[(preLayouts?.length || 0) - 1];

						return (last.w + last.x) % 12;
					}
					return 0;
				};

				return [
					...preLayouts,
					{
						i: (preLayouts.length + 1).toString(),
						x: getX(),
						y: Infinity,
						w: 6,
						h: 2,
						Component: AddWidgetWrapper,
						maxW: 6,
						isDraggable: false,
						isResizable: false,
						isBounded: true,
					},
				];
			});
		}

		return (): void => {
			isMounted.current = false;
		};
	}, [widgets, layouts.length, AddWidgetWrapper, loading, getPreLayouts]);

	const onDropHandler = useCallback(
		async (allLayouts: Layout[], currentLayout: Layout, event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer) {
				try {
					const graphType = event.dataTransfer.getData('text') as GRAPH_TYPES;
					const generateWidgetId = v4();

					await updateDashboard({
						data,
						generateWidgetId,
						graphType,
						selectedDashboard,
						layout: allLayouts
							.map((e, index) => ({
								...e,
								i: index.toString(),
								// when a new element drops
								w: e.i === '__dropping-elem__' ? 6 : e.w,
								h: e.i === '__dropping-elem__' ? 2 : e.h,
							}))
							// removing add widgets layout config
							.filter((e) => e.maxW === undefined),
					});
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

	const onLayoutSaveHandler = async (): Promise<void> => {
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
				layout: saveLayoutState.payload.filter((e) => e.maxW === undefined),
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
	};

	const onLayoutChangeHandler = (layout: Layout[]): void => {
		setSaveLayoutState({
			loading: false,
			error: false,
			errorMessage: '',
			payload: layout,
		});
	};

	if (layouts.length === 0) {
		return <Spinner height="40vh" size="large" tip="Loading..." />;
	}

	console.log({ layouts });

	return (
		<>
			{saveLayout && (
				<ButtonContainer>
					<Button
						loading={saveLayoutState.loading}
						onClick={onLayoutSaveHandler}
						icon={<SaveFilled />}
						danger={saveLayoutState.error}
					>
						Save Layout
					</Button>
				</ButtonContainer>
			)}

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
							key={rest.i + JSON.stringify(widget)}
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

export default memo(GridGraph);
