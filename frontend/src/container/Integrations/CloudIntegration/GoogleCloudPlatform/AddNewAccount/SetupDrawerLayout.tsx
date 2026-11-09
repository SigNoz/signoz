import { ReactNode, useState } from 'react';
import { Drawer } from '@signozhq/ui/drawer';

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
		<Drawer
			type="task"
			open
			onClose={onClose}
			title="Connect Google Cloud Platform"
			width="extra-wide"
			footerSuffix={<div ref={setFooterSlot} className={styles.footerSlot} />}
			testId="gcp-setup-drawer"
		>
			<div className={styles.body}>{children(footerSlot)}</div>
		</Drawer>
	);
}

export default SetupDrawerLayout;
