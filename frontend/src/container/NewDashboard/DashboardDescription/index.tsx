import './Description.styles.scss';

import { LockFilled, UnlockFilled } from '@ant-design/icons';
import { Button, Card, Col, Row, Tag, Tooltip, Typography } from 'antd';
import useComponentPermission from 'hooks/useComponentPermission';
import { Share2 } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DashboardData } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

import DashboardVariableSelection from '../DashboardVariablesSelection';
import SettingsDrawer from './SettingsDrawer';
import ShareModal from './ShareModal';

function DashboardDescription(): JSX.Element {
	const {
		selectedDashboard,
		isDashboardLocked,
		handleDashboardLockToggle,
	} = useDashboard();

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.uuid,
		  }
		: ({} as DashboardData);

	const { title = '', tags, description } = selectedData || {};

	const [openDashboardJSON, setOpenDashboardJSON] = useState<boolean>(false);

	const { user, role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [editDashboard] = useComponentPermission(['edit_dashboard'], role);

	let isAuthor = false;

	if (selectedDashboard && user && user.email) {
		isAuthor = selectedDashboard?.created_by === user?.email;
	}

	const onToggleHandler = (): void => {
		setOpenDashboardJSON((state) => !state);
	};

	const handleLockDashboardToggle = (): void => {
		handleDashboardLockToggle(!isDashboardLocked);
	};

	return (
		<Card className="dashboard-description-container">
			<Row gutter={16}>
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
			</Row>
		</Card>
	);
}

export default DashboardDescription;
