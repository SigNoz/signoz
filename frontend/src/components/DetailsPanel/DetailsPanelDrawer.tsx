import { Drawer, DrawerContent } from '@signozhq/ui/drawer';
import cx from 'classnames';
import { AnimatePresence } from 'motion/react';

import styles from './DetailsPanelDrawer.module.scss';

interface DetailsPanelDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
	testId?: string;
}

function DetailsPanelDrawer({
	isOpen,
	onClose,
	children,
	className,
	testId,
}: DetailsPanelDrawerProps): JSX.Element {
	return (
		<Drawer
			open={isOpen}
			onOpenChange={(open): void => {
				if (!open) {
					onClose();
				}
			}}
			modal={false}
		>
			<AnimatePresence>
				{isOpen && (
					<DrawerContent
						forceMount
						direction="right"
						width="extra-wide"
						showOverlay={false}
						// The page stays usable behind the drawer; only close or Esc dismiss it.
						onInteractOutside={(e): void => e.preventDefault()}
						className={cx(styles.drawer, className)}
						testId={testId}
					>
						<div className={styles.body}>{children}</div>
					</DrawerContent>
				)}
			</AnimatePresence>
		</Drawer>
	);
}

DetailsPanelDrawer.defaultProps = {
	className: undefined,
	testId: undefined,
};

export default DetailsPanelDrawer;
