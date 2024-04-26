import './Description.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Tag, Tooltip, Typography } from 'antd';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import { CircleEllipsis, LayoutGrid, Link2, Tent, Zap } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DashboardData } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';

import DashboardVariableSelection from '../DashboardVariablesSelection';
import SettingsDrawer from './SettingsDrawer';
import ShareModal from './ShareModal';

function DashboardDescription(): JSX.Element {
	const {
		selectedDashboard,
		isDashboardLocked,
		handleToggleDashboardSlider,
		// handleDashboardLockToggle,
	} = useDashboard();

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.uuid,
		  }
		: ({} as DashboardData);

	const { title = '', description, tags } = selectedData || {};

	const [openDashboardJSON, setOpenDashboardJSON] = useState<boolean>(false);

	const { user, role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [editDashboard] = useComponentPermission(['edit_dashboard'], role);

	// let isAuthor = false;

	// if (selectedDashboard && user && user.email) {
	// 	isAuthor = selectedDashboard?.created_by === user?.email;
	// }

	let permissions: ComponentTypes[] = ['add_panel'];

	if (isDashboardLocked) {
		permissions = ['add_panel_locked_dashboard'];
	}

	const userRole: ROLES | null =
		selectedDashboard?.created_by === user?.email
			? (USER_ROLES.AUTHOR as ROLES)
			: role;

	const [addPanelPermission] = useComponentPermission(permissions, userRole);

	const onToggleHandler = (): void => {
		setOpenDashboardJSON((state) => !state);
	};

	const onEmptyWidgetHandler = useCallback(() => {
		handleToggleDashboardSlider(true);
	}, [handleToggleDashboardSlider]);

	// const handleLockDashboardToggle = (): void => {
	// 	handleDashboardLockToggle(!isDashboardLocked);
	// };

	return (
		<Card className="dashboard-description-container">
			<section className="dashboard-breadcrumbs">
				<Button
					type="text"
					icon={<LayoutGrid size={14} />}
					className="dashboard-btn"
					onClick={(): void => history.push(ROUTES.ALL_DASHBOARD)}
				>
					Dashboard
				</Button>
				<Button type="text" className="id-btn" icon={<Tent size={14} />}>
					{title}
				</Button>
			</section>
			<section className="dashbord-details">
				<div className="left-section">
					<Tent size={14} />
					<Typography.Text className="dashboard-title">{title}</Typography.Text>
				</div>
				<div className="right-section">
					<Tooltip title="Actions">
						<Button
							icon={<CircleEllipsis size={14} />}
							type="text"
							className="icons"
						/>
					</Tooltip>
					<Tooltip title="Share dashboard">
						<Button
							icon={<Link2 size={14} />}
							type="text"
							className="icons"
							onClick={onToggleHandler}
						/>
					</Tooltip>
					<Tooltip title="Activity">
						<Button icon={<Zap size={14} />} type="text" className="icons" />
					</Tooltip>
					<DateTimeSelectionV2 showAutoRefresh hideShareModal />
					{!isDashboardLocked && editDashboard && (
						<SettingsDrawer drawerTitle="Dashboard Configuration" />
					)}
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
					{selectedData && (
						<ShareModal
							isJSONModalVisible={openDashboardJSON}
							onToggleHandler={onToggleHandler}
							selectedData={selectedData}
						/>
					)}
				</div>
			</section>
			<div className="dashboard-tags">
				{tags?.map((tag) => (
					<Tag key={tag} className="tag">
						{tag}
					</Tag>
				))}
			</div>
			<section className="dashboard-description-section">{description}</section>
			<section className="dashboard-variables">
				<DashboardVariableSelection />
			</section>

			{/* <Row gutter={16}>
				<Col flex={1} span={9}>
					<Typography.Title
						level={4}
						style={{ padding: 0, margin: 0 }}
						data-testid="dashboard-landing-name"
					>
						{isDashboardLocked && (
							<Tooltip title="Dashboard Locked" placement="top">
								<LockFilled /> &nbsp;
							</Tooltip>
						)}
						{title}
					</Typography.Title>
					{description && (
						<Typography
							className="dashboard-description"
							data-testid="dashboard-landing-desc"
						>
							{description}
						</Typography>
					)}

					{tags && (
						<div style={{ margin: '0.5rem 0' }}>
							{tags?.map((tag) => (
								<Tag key={tag}>{tag}</Tag>
							))}
						</div>
					)}
				</Col>
				<Col span={14}>
					<Row justify="end">
						<DashboardVariableSelection />
					</Row>
				</Col>
				<Col span={1} style={{ textAlign: 'right' }}>
					{selectedData && (
						<ShareModal
							isJSONModalVisible={openDashboardJSON}
							onToggleHandler={onToggleHandler}
							selectedData={selectedData}
						/>
					)}

					<div className="dashboard-actions">
						{!isDashboardLocked && editDashboard && (
							<SettingsDrawer drawerTitle="Dashboard Configuration" />
						)}

						<Tooltip title="Share" placement="left">
							<Button
								className="periscope-btn"
								style={{ width: '100%' }}
								onClick={onToggleHandler}
								icon={<Share2 size={16} />}
							/>
						</Tooltip>

						{(isAuthor || role === USER_ROLES.ADMIN) && (
							<Tooltip
								placement="left"
								title={isDashboardLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
							>
								<Button
									style={{ width: '100%' }}
									className="periscope-btn"
									onClick={handleLockDashboardToggle}
									icon={isDashboardLocked ? <LockFilled /> : <UnlockFilled />}
								/>
							</Tooltip>
						)}
					</div>
				</Col>
			</Row> */}
		</Card>
	);
}

export default DashboardDescription;
