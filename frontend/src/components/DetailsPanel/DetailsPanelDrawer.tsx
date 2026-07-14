import { DrawerWrapper } from '@signozhq/ui/drawer';

import './DetailsPanelDrawer.styles.scss';

interface DetailsPanelDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
}

function DetailsPanelDrawer({
	isOpen,
	onClose,
	children,
	className,
}: DetailsPanelDrawerProps): JSX.Element {
	return (
		<DrawerWrapper
			open={isOpen}
			onOpenChange={(open): void => {
				if (!open) {
					onClose();
				}
			}}
			direction="right"
			showOverlay={false}
			className={`details-panel-drawer ${className || ''}`}
		>
			<div className="details-panel-drawer__body">{children}</div>
		</DrawerWrapper>
	);
}

export default DetailsPanelDrawer;
