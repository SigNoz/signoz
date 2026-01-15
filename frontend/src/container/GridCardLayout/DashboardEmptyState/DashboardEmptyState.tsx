/* eslint-disable jsx-a11y/img-redundant-alt */
import './DashboardEmptyState.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import SettingsDrawer from 'container/DashboardContainer/DashboardDescription/SettingsDrawer';
import { VariablesSettingsTab } from 'container/DashboardContainer/DashboardDescription/types';
import DashboardSettings from 'container/DashboardContainer/DashboardSettings';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useRef, useState } from 'react';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';

export default function DashboardEmptyState(): JSX.Element {
	const {
		selectedDashboard,
		isDashboardLocked,
		handleToggleDashboardSlider,
		setSelectedRowWidgetId,
	} = useDashboard();

	const variablesSettingsTabHandle = useRef<VariablesSettingsTab>(null);
	const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState<boolean>(
		false,
	);

	const { user } = useAppContext();
	let permissions: ComponentTypes[] = ['add_panel'];

	if (isDashboardLocked) {
		permissions = ['add_panel_locked_dashboard'];
	}

	const userRole: ROLES | null =
		selectedDashboard?.createdBy === user?.email
			? (USER_ROLES.AUTHOR as ROLES)
			: user.role;

	const [addPanelPermission] = useComponentPermission(permissions, userRole);

	const onEmptyWidgetHandler = useCallback(() => {
		setSelectedRowWidgetId(null);
		handleToggleDashboardSlider(true);
		logEvent('Dashboard Detail: Add new panel clicked', {
			dashboardId: selectedDashboard?.id,
			dashboardName: selectedDashboard?.data.title,
			numberOfPanels: selectedDashboard?.data.widgets?.length,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handleToggleDashboardSlider]);

	const onConfigureClick = useCallback((): void => {
		setIsSettingsDrawerOpen(true);
	}, []);

	const onSettingsDrawerClose = useCallback((): void => {
		setIsSettingsDrawerOpen(false);

		if (variablesSettingsTabHandle.current) {
			variablesSettingsTabHandle.current.resetState();
		}
	}, []);

	return (
		<section className="dashboard-empty-state">
			<div className="dashboard-content">
				<section className="heading">
					<img
						src="/Icons/dashboard_emoji.svg"
						alt="header-image"
						style={{ height: '32px', width: '32px' }}
					/>
					<Typography.Text className="welcome">
						Welcome to your new dashboard
					</Typography.Text>
					<Typography.Text className="welcome-info">
						Follow the steps to populate it with data and share with your teammates
					</Typography.Text>
				</section>
				<section className="actions">
					<div className="actions-1">
						<div className="actions-configure">
							<div className="actions-configure-text">
								<img
									src="/Icons/tools.svg"
									alt="header-image"
									style={{ height: '14px', width: '14px' }}
								/>
								<Typography.Text className="configure">
									Configure your new dashboard
								</Typography.Text>
							</div>
							<Typography.Text className="configure-info">
								Give it a name, add description, tags and variables
							</Typography.Text>
						</div>
						{/* This Empty State needs to be consolidated. The SettingsDrawer should be global to the 
						whole dashboard page instead of confined to this Empty State */}
						<Button
							type="text"
							className="configure-button"
							icon={<ConfigureIcon />}
							data-testid="show-drawer"
							onClick={onConfigureClick}
						>
							Configure
						</Button>
						<SettingsDrawer
							drawerTitle="Dashboard Configuration"
							isOpen={isSettingsDrawerOpen}
							onClose={onSettingsDrawerClose}
						>
							<DashboardSettings
								variablesSettingsTabHandle={variablesSettingsTabHandle}
							/>
						</SettingsDrawer>
					</div>
					<div className="actions-1">
						<div className="actions-add-panel">
							<div className="actions-panel-text">
								<img
									src="/Icons/landscape.svg"
									alt="header-image"
									style={{ height: '14px', width: '14px' }}
								/>
								<Typography.Text className="panel">Add panels</Typography.Text>
							</div>
							<Typography.Text className="panel-info">
								Add panels to visualize your data
							</Typography.Text>
						</div>
						{!isDashboardLocked && addPanelPermission && (
							<Button
								className="add-panel-btn"
								onClick={onEmptyWidgetHandler}
								icon={<PlusOutlined />}
								type="primary"
								data-testid="add-panel"
							>
								New Panel
							</Button>
						)}
					</div>
				</section>
			</div>
		</section>
	);
}
