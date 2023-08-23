import { PlusOutlined, SaveFilled } from '@ant-design/icons';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { Layout } from 'react-grid-layout';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';

import GridCard from './GridCard';
import {
	Button,
	ButtonContainer,
	Card,
	CardContainer,
	ReactGridLayout,
} from './styles';
import { MenuItemKeys } from './WidgetHeader/contants';

function GraphLayout({
	layouts,
	onAddPanelHandler,
	setLayout,
	widgets,
}: GraphLayoutProps): JSX.Element {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const isDarkMode = useIsDarkMode();

	const updateDashboardMutation = useUpdateDashboard();

	const { notifications } = useNotifications();

	const [saveLayoutPermission, addPanelPermission] = useComponentPermission(
		['save_layout', 'add_panel'],
		role,
	);

	const [selectedDashboard] = dashboards;

	const onSaveHandler = (): void => {
		const { data } = selectedDashboard;

		const updatedDashboard: Dashboard = {
			...selectedDashboard,
			data: {
				title: data.title,
				description: data.description,
				name: data.name,
				tags: data.tags,
				widgets: data.widgets,
				variables: data.variables,
				layout: layouts.filter((e) => e.i !== PANEL_TYPES.EMPTY_WIDGET),
			},
			uuid: selectedDashboard.uuid,
		};

		updateDashboardMutation.mutate(updatedDashboard, {
			onSuccess: () => {
				featureResponse.refetch();

				notifications.success({
					message: 'Layout saved successfully',
				});
			},
		});
	};

	return (
		<>
			<ButtonContainer>
				{saveLayoutPermission && (
					<Button
						loading={updateDashboardMutation.isLoading}
						onClick={onSaveHandler}
						icon={<SaveFilled />}
						disabled={updateDashboardMutation.isLoading}
					>
						Save Layout
					</Button>
				)}

				{addPanelPermission && (
					<Button onClick={onAddPanelHandler} icon={<PlusOutlined />}>
						Add Panel
					</Button>
				)}
			</ButtonContainer>

			<ReactGridLayout
				cols={12}
				rowHeight={100}
				autoSize
				width={100}
				isDraggable={addPanelPermission}
				isDroppable={addPanelPermission}
				isResizable={addPanelPermission}
				allowOverlap={false}
				onLayoutChange={setLayout}
				draggableHandle=".drag-handle"
			>
				{layouts.map(({ ...rest }) => {
					const currentWidget = (widgets || [])?.find((e) => e.id === rest.i);

					return (
						<CardContainer isDarkMode={isDarkMode} key={rest.i} data-grid={rest}>
							<Card $panelType={currentWidget?.panelTypes || PANEL_TYPES.TIME_SERIES}>
								<GridCard
									widget={currentWidget || ({ id: rest.i } as Widgets)}
									name={currentWidget?.id || ''}
									headerMenuList={[
										MenuItemKeys.Clone,
										MenuItemKeys.Delete,
										MenuItemKeys.Edit,
										MenuItemKeys.View,
									]}
									setLayout={setLayout}
								/>
							</Card>
						</CardContainer>
					);
				})}
			</ReactGridLayout>
		</>
	);
}

interface GraphLayoutProps {
	layouts: Layout[];
	onAddPanelHandler: VoidFunction;
	widgets: Widgets[] | undefined;
	setLayout: (layout: Layout[]) => void;
}

export default GraphLayout;
