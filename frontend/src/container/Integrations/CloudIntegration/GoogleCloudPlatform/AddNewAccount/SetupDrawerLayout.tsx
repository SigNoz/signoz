import { ReactNode, useState } from 'react';
import { DrawerWrapper } from '@signozhq/ui/drawer';

import styles from './SetupDrawerLayout.module.scss';

interface SetupDrawerLayoutProps {
	onClose: () => void;
	/** Receives the footer slot element that SetupDrawerFooter portals into. */
	children: (footerSlot: HTMLDivElement | null) => ReactNode;
}

/** Stays mounted across connection method switches so the drawer does not replay its open animation. */
function SetupDrawerLayout({
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
			width="extra-wide"
			footer={<div ref={setFooterSlot} className={styles.footerSlot} />}
			testId="gcp-setup-drawer"
		>
			{children(footerSlot)}
		</DrawerWrapper>
	);
}

export default SetupDrawerLayout;
