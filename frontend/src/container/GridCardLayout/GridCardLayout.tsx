import { PlusOutlined, SaveFilled } from '@ant-design/icons';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import { headerMenuList } from './config';
import GridCard from './GridCard';
import {
	Button,
	ButtonContainer,
	Card,
	CardContainer,
	ReactGridLayout,
} from './styles';
import { GraphLayoutProps } from './types';

function GraphLayout({
	onAddPanelHandler,
	widgets,
}: GraphLayoutProps): JSX.Element {
	const {
		selectedDashboard,
		layouts,
		setLayouts,
		setSelectedDashboard,
	} = useDashboard();
	const { t } = useTranslation(['dashboard']);

	const { featureResponse, role } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const isDarkMode = useIsDarkMode();

	const updateDashboardMutation = useUpdateDashboard();

	const { notifications } = useNotifications();

	const [saveLayoutPermission, addPanelPermission] = useComponentPermission(
		['save_layout', 'add_panel'],
		role,
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
						{t('dashboard:save_layout')}
					</Button>
				)}

				{addPanelPermission && (
					<Button onClick={onAddPanelHandler} icon={<PlusOutlined />}>
						{t('dashboard:add_panel')}
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
				onLayoutChange={setLayouts}
				draggableHandle=".drag-handle"
				layout={layouts}
			>
				{layouts.map((layout) => {
					const { i: id } = layout;
					const currentWidget = (widgets || [])?.find((e) => e.id === id);

					return (
						<CardContainer isDarkMode={isDarkMode} key={id} data-grid={layout}>
							<Card $panelType={currentWidget?.panelTypes || PANEL_TYPES.TIME_SERIES}>
								<GridCard
									widget={currentWidget || ({ id } as Widgets)}
									name={currentWidget?.id || ''}
									headerMenuList={headerMenuList}
								/>
							</Card>
						</CardContainer>
					);
				})}
			</ReactGridLayout>
		</>
	);
}

export default GraphLayout;
