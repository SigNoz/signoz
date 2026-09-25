import { memo, PropsWithChildren, ReactElement } from 'react';
import { Drawer } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';

import styles from './SettingsDrawer.module.scss';

type SettingsDrawerProps = PropsWithChildren<{
	drawerTitle: string;
	isOpen: boolean;
	onClose: () => void;
	/** Unmount the content on close so it re-initializes on the next open. */
	destroyOnClose?: boolean;
}>;

function SettingsDrawer({
	children,
	drawerTitle,
	isOpen,
	onClose,
	destroyOnClose = false,
}: SettingsDrawerProps): JSX.Element {
	return (
		<Drawer
			title={drawerTitle}
			placement="right"
			width="50%"
			onClose={onClose}
			open={isOpen}
			destroyOnClose={destroyOnClose}
			rootClassName={styles.settingsContainerRoot}
		>
			{/* Need to type cast because of OverlayScrollbar type definition. We should be good once we remove it. */}
			<OverlayScrollbar>{children as ReactElement}</OverlayScrollbar>
		</Drawer>
	);
}

export default memo(SettingsDrawer);
