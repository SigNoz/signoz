import { SettingOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';

import DashboardSettingsContent from '../DashboardSettings';
import { DrawerContainer } from './styles';

function SettingsDrawer({ drawerTitle }: { drawerTitle: string }): JSX.Element {
	const [visible, setVisible] = useState<boolean>(false);

	const showDrawer = (): void => {
		setVisible(true);
	};

	const onClose = (): void => {
		setVisible(false);
	};

	return (
		<>
			<Button
				type="dashed"
				onClick={showDrawer}
				style={{ width: '100%' }}
				data-testid="show-drawer"
			>
				<SettingOutlined /> Configure
			</Button>
			<DrawerContainer
				title={drawerTitle}
				placement="right"
				width="60%"
				onClose={onClose}
				open={visible}
			>
				<DashboardSettingsContent />
			</DrawerContainer>
		</>
	);
}

export default SettingsDrawer;
