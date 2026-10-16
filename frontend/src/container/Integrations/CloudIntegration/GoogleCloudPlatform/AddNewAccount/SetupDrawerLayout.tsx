import { ReactNode, useState } from 'react';
import { DrawerWrapper } from '@signozhq/ui/drawer';

import styles from './SetupDrawerLayout.module.scss';

interface SetupDrawerLayoutProps {
	isWide: boolean;
	onClose: () => void;
	/** Receives the footer slot element that SetupDrawerFooter portals into. */
	children: (footerSlot: HTMLDivElement | null) => ReactNode;
}

/** Stays mounted across connection method switches so the drawer does not replay its open animation. */
function SetupDrawerLayout({
	isWide,
	onClose,
	children,
}: SetupDrawerLayoutProps): JSX.Element {
	const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);

	return (
		<DrawerWrapper
			open={true}
			className={styles.setupDrawer}
			onOpenChange={(open): void => {
				if (!open) {
					onClose();
				}
			}}
			direction="right"
			showCloseButton
			title="Connect Google Cloud Platform"
			width={isWide ? 'extra-wide' : 'base'}
			footer={<div ref={setFooterSlot} className={styles.footerSlot} />}
			drawerHeaderProps={{ className: styles.title }}
			testId="gcp-setup-drawer"
		>
			{children(footerSlot)}
		</DrawerWrapper>
	);
}

export default SetupDrawerLayout;
