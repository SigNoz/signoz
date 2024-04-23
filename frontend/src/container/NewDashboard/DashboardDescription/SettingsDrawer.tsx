import './Description.styles.scss';

import { Button, Tooltip } from 'antd';
import { Cog } from 'lucide-react';
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
			<Tooltip title="Configure" placement="left">
				<Button
					className="periscope-btn"
					onClick={showDrawer}
					style={{ width: '100%' }}
					data-testid="show-drawer"
					icon={<Cog size={16} />}
				/>
			</Tooltip>

			<DrawerContainer
				title={drawerTitle}
				placement="right"
				width="50%"
				onClose={onClose}
				open={visible}
				rootClassName="settings-container-root"
			>
				<DashboardSettingsContent />
			</DrawerContainer>
		</>
	);
}

export default SettingsDrawer;
