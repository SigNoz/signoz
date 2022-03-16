/* eslint-disable react/display-name */
import { SaveFilled } from '@ant-design/icons';
import updateDashboardApi from 'api/dashboard/update';
import Spinner from 'components/Spinner';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
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

const GridGraph = (): JSX.Element => {
	const { push } = useHistory();
	const { pathname } = useLocation();

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

	const getPreLayouts: () => LayoutProps[] = useCallback(() => {
		if (widgets === undefined) {
			return [];
		}

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
							name={e.id + index + 'non-expanded'}
							isDeleted={isDeleted}
							widget={widgets[index]}
							yAxisUnit={e.yAxisUnit}
						/>
					),
				};
			});
		} else {
			return data.layout.map((e, index) => ({
				...e,
				y: 0,
				Component: (): JSX.Element => (
					<Graph
						name={e.i + index}
						isDeleted={isDeleted}
						widget={widgets[index]}
					/>
				),
			}));
		}
	}, [widgets, data.layout]);

	useEffect(() => {
		if (
			loading === false &&
			(isMounted.current === true || isDeleted.current === true)
		) {
			const preLayouts = getPreLayouts();
			setLayout(() => [
				...preLayouts,
				{
					i: (preLayouts.length + 1).toString(),
					x: (preLayouts.length % 2) * 6,
					y: Infinity,
					w: 6,
					h: 2,
					Component: AddWidgetWrapper,
					maxW: 6,
					isDraggable: false,
					isResizable: false,
					isBounded: true,
				},
			]);
		}

		return (): void => {
			isMounted.current = false;
		};
	}, [widgets, layouts.length, AddWidgetWrapper, loading, getPreLayouts]);

	const onDropHandler = useCallback(
		(allLayouts: Layout[], currectLayout: Layout, event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer) {
				const graphType = event.dataTransfer.getData('text') as GRAPH_TYPES;
				const generateWidgetId = v4();
				push(`${pathname}/new?graphType=${graphType}&widgetId=${generateWidgetId}`);
			}
		},
		[pathname, push],
	);

	const onLayoutSaveHanlder = async (): Promise<void> => {
		setSaveLayoutState((state) => ({
			...state,
			error: false,
			errorMessage: '',
			loading: true,
		}));

		const response = await updateDashboardApi({
			title: data.title,
			uuid: selectedDashboard.uuid,
			description: data.description,
			name: data.name,
			tags: data.tags,
			widgets: data.widgets,
			layout: saveLayoutState.payload.filter((e) => e.maxW === undefined),
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

	return (
		<>
			<ButtonContainer>
				<Button
					loading={saveLayoutState.loading}
					onClick={onLayoutSaveHanlder}
					icon={<SaveFilled />}
					danger={saveLayoutState.error}
				>
					Save Layout
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
				onLayoutChange={onLayoutChangeHandler}
			>
				{layouts.map(({ Component, ...rest }, index) => {
					const widget = (widgets || [])[index] || {};

					const type = widget.panelTypes;

					const isQueryType = type === 'VALUE';

					return (
						<CardContainer key={rest.i} data-grid={rest}>
							<Card isQueryType={isQueryType}>
								<Component />
							</Card>
						</CardContainer>
					);
				})}
			</ReactGridLayout>
		</>
	);
};

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
