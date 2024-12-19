import './Description.styles.scss';

import { Button } from 'antd';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
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
			<Button
				type="text"
				className="configure-button"
				icon={<ConfigureIcon />}
				data-testid="show-drawer"
				onClick={showDrawer}
			>
				Configure
			</Button>

			<DrawerContainer
				title={drawerTitle}
				placement="right"
				width="50%"
				onClose={onClose}
				open={visible}
				rootClassName="settings-container-root"
			>
				<OverlayScrollbar>
					<DashboardSettingsContent variableViewModeRef={variableViewModeRef} />
				</OverlayScrollbar>
			</DrawerContainer>
		</>
	);
}

export default SettingsDrawer;
