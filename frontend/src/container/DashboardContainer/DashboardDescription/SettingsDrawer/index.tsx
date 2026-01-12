import './SettingsDrawer.styles.scss';

import { Drawer } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { memo, PropsWithChildren, ReactElement } from 'react';

type SettingsDrawerProps = PropsWithChildren<{
	drawerTitle: string;
	isOpen: boolean;
	onClose: () => void;
}>;

function SettingsDrawer({
	children,
	drawerTitle,
	isOpen,
	onClose,
}: SettingsDrawerProps): JSX.Element {
	return (
		<Drawer
			title={drawerTitle}
			placement="right"
			width="50%"
			onClose={onClose}
			open={isOpen}
			rootClassName="settings-container-root"
		>
			{/* Need to type cast because of OverlayScrollbar type definition. We should be good once we remove it. */}
			<OverlayScrollbar>{children as ReactElement}</OverlayScrollbar>
		</Drawer>
	);
}

export default memo(SettingsDrawer);
