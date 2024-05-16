import './Description.styles.scss';

import { Button, Tooltip } from 'antd';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import { useRef, useState } from 'react';

import DashboardSettingsContent from '../DashboardSettings';
import { DrawerContainer } from './styles';

function SettingsDrawer({ drawerTitle }: { drawerTitle: string }): JSX.Element {
	const [visible, setVisible] = useState<boolean>(false);

	const variableViewModeRef = useRef<() => void>();

	const showDrawer = (): void => {
		setVisible(true);
	};

	const onClose = (): void => {
		setVisible(false);
		variableViewModeRef?.current?.();
	};

	return (
		<>
			<Tooltip title="Configure" placement="left">
				<Button
					type="text"
					className="configure-button"
					icon={<ConfigureIcon />}
					data-testid="show-drawer"
					onClick={showDrawer}
				>
					Configure
				</Button>
			</Tooltip>

			<DrawerContainer
				title={drawerTitle}
				placement="right"
				width="50%"
				onClose={onClose}
				open={visible}
				rootClassName="settings-container-root"
			>
				<DashboardSettingsContent variableViewModeRef={variableViewModeRef} />
			</DrawerContainer>
		</>
	);
}

export default SettingsDrawer;
