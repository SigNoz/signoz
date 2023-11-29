import './GridCardLayout.styles.scss';

import { PlusOutlined, SaveFilled } from '@ant-design/icons';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { FullscreenIcon } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';

import { EditMenuAction, ViewMenuAction } from './config';
import GridCard from './GridCard';
import {
	Button,
	ButtonContainer,
	Card,
	CardContainer,
	ReactGridLayout,
} from './styles';
import { GraphLayoutProps } from './types';

function GraphLayout({ onAddPanelHandler }: GraphLayoutProps): JSX.Element {
	const {
		selectedDashboard,
		layouts,
		setLayouts,
		setSelectedDashboard,
		isDashboardLocked,
	} = useDashboard();
	const { data } = selectedDashboard || {};
	const handle = useFullScreenHandle();

	const { widgets, variables } = data || {};

	const { t } = useTranslation(['dashboard']);

	const { featureResponse, role, user } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const isDarkMode = useIsDarkMode();

	const updateDashboardMutation = useUpdateDashboard();

	const { notifications } = useNotifications();

	let permissions: ComponentTypes[] = ['save_layout', 'add_panel'];

	if (isDashboardLocked) {
		permissions = ['edit_locked_dashboard', 'add_panel_locked_dashboard'];
	}

	const userRole: ROLES | null =
		selectedDashboard?.created_by === user?.email
			? (USER_ROLES.AUTHOR as ROLES)
			: role;

	const [saveLayoutPermission, addPanelPermission] = useComponentPermission(
		permissions,
		userRole,
	);

	const onSaveHandler = (): void => {
		if (!selectedDashboard) return;

		const updatedDashboard: Dashboard = {
			...selectedDashboard,
			data: {
				...selectedDashboard.data,
				layout: layouts.filter((e) => e.i !== PANEL_TYPES.EMPTY_WIDGET),
			},
			uuid: selectedDashboard.uuid,
		};

		updateDashboardMutation.mutate(updatedDashboard, {
			onSuccess: (updatedDashboard) => {
				if (updatedDashboard.payload) {
					if (updatedDashboard.payload.data.layout)
						setLayouts(updatedDashboard.payload.data.layout);
					setSelectedDashboard(updatedDashboard.payload);
				}
				notifications.success({
					message: t('dashboard:layout_saved_successfully'),
				});

				featureResponse.refetch();
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	};

	const widgetActions = !isDashboardLocked
		? [...ViewMenuAction, ...EditMenuAction]
		: [...ViewMenuAction];

	return (
		<>
			<ButtonContainer>
				<Button
					loading={updateDashboardMutation.isLoading}
					onClick={handle.enter}
					icon={<FullscreenIcon size={16} />}
					disabled={updateDashboardMutation.isLoading}
				>
					{t('dashboard:full_view')}
				</Button>

				{!isDashboardLocked && saveLayoutPermission && (
					<Button
						loading={updateDashboardMutation.isLoading}
						onClick={onSaveHandler}
						icon={<SaveFilled />}
						disabled={updateDashboardMutation.isLoading}
					>
						{t('dashboard:save_layout')}
					</Button>
				)}

				{!isDashboardLocked && addPanelPermission && (
					<Button
						onClick={onAddPanelHandler}
						icon={<PlusOutlined />}
						data-testid="add-panel"
					>
						{t('dashboard:add_panel')}
					</Button>
				)}
			</ButtonContainer>

			<FullScreen handle={handle} className="fullscreen-grid-container">
				<ReactGridLayout
					cols={12}
					rowHeight={100}
					autoSize
					width={100}
					useCSSTransforms
					isDraggable={!isDashboardLocked && addPanelPermission}
					isDroppable={!isDashboardLocked && addPanelPermission}
					isResizable={!isDashboardLocked && addPanelPermission}
					allowOverlap={false}
					onLayoutChange={setLayouts}
					draggableHandle=".drag-handle"
					layout={layouts}
				>
					{layouts.map((layout) => {
						const { i: id } = layout;
						const currentWidget = (widgets || [])?.find((e) => e.id === id);

						return (
							<CardContainer
								className={isDashboardLocked ? '' : 'enable-resize'}
								isDarkMode={isDarkMode}
								key={id}
								data-grid={layout}
							>
								<Card
									className="grid-item"
									$panelType={currentWidget?.panelTypes || PANEL_TYPES.TIME_SERIES}
								>
									<GridCard
										widget={currentWidget || ({ id, query: {} } as Widgets)}
										name={currentWidget?.id || ''}
										headerMenuList={widgetActions}
										variables={variables}
									/>
								</Card>
							</CardContainer>
						);
					})}
				</ReactGridLayout>
			</FullScreen>
		</>
	);
}

export default GraphLayout;
