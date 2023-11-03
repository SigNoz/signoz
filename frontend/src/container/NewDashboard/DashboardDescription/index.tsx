import { LockFilled, ShareAltOutlined, UnlockFilled } from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Tag, Tooltip, Typography } from 'antd';
import useComponentPermission from 'hooks/useComponentPermission';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
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

	const selectedData = selectedDashboard?.data;
	const { title, tags, description } = selectedData || {};

	const [isJSONModalVisible, isIsJSONModalVisible] = useState<boolean>(false);

	const { t } = useTranslation('common');
	const { user, role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [editDashboard] = useComponentPermission(['edit_dashboard'], role);

	let isAuthor = false;

	if (selectedDashboard && user && user.email) {
		isAuthor = selectedDashboard?.created_by === user?.email;
	}

	const onToggleHandler = (): void => {
		isIsJSONModalVisible((state) => !state);
	};

	const handleLockDashboardToggle = (): void => {
		handleDashboardLockToggle(!isDashboardLocked);
	};

	return (
		<Card>
			<Row>
				<Col flex={1}>
					<Typography.Title level={4} style={{ padding: 0, margin: 0 }}>
						{isDashboardLocked && (
							<Tooltip title="Dashboard Locked" placement="top">
								<LockFilled /> &nbsp;
							</Tooltip>
						)}
						{title}
					</Typography.Title>
					<Typography>{description}</Typography>

					<div style={{ margin: '0.5rem 0' }}>
						{tags?.map((tag) => (
							<Tag key={tag}>{tag}</Tag>
						))}
					</div>

					<DashboardVariableSelection />
				</Col>
				<Col>
					{selectedData && (
						<ShareModal
							isJSONModalVisible={isJSONModalVisible}
							onToggleHandler={onToggleHandler}
							selectedData={selectedData}
						/>
					)}

					<Space direction="vertical">
						{!isDashboardLocked && editDashboard && <SettingsDrawer />}
						<Button
							style={{ width: '100%' }}
							type="dashed"
							onClick={onToggleHandler}
							icon={<ShareAltOutlined />}
						>
							{t('share')}
						</Button>
						{(isAuthor || role === USER_ROLES.ADMIN) && (
							<Tooltip
								placement="left"
								title={isDashboardLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
							>
								<Button
									style={{ width: '100%' }}
									type="dashed"
									onClick={handleLockDashboardToggle}
									icon={isDashboardLocked ? <LockFilled /> : <UnlockFilled />}
								>
									{isDashboardLocked ? 'Unlock' : 'Lock'}
								</Button>
							</Tooltip>
						)}
					</Space>
				</Col>
			</Row>
		</Card>
	);
}

export default DashboardDescription;
