import {
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@signozhq/ui/dialog';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { ConfigProvider } from 'antd';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useRef } from 'react';

import ViewPanelModalContent from './ViewPanelModalContent';
import styles from './ViewPanelModal.module.scss';

interface ViewPanelModalProps {
	/**
	 * The expanded panel and its id. Absent while the modal is closed — a single
	 * host instance lives at the layout level and only carries a panel when open.
	 */
	panel?: DashboardtypesPanelDTO;
	panelId?: string;
	open: boolean;
	onClose: () => void;
}

function ViewPanelModal({
	panel,
	panelId,
	open,
	onClose,
}: ViewPanelModalProps): JSX.Element {
	const name = panel?.spec.display.name ?? '';

	// Render antd popups into the dialog (not document.body) so they stay inside the
	// modal's interactive, focus-trapped layer instead of being blocked by Radix.
	const contentRef = useRef<HTMLDivElement>(null);

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
		>
			<DialogContent
				ref={contentRef}
				position="center"
				width="extra-wide"
				className={styles.dialog}
			>
				<DialogHeader>
					<DialogTitle>
						<TooltipSimple title={name} arrow>
							<Typography.Text className={styles.title}>
								{name ? `${name} - (View mode)` : 'View mode'}
							</Typography.Text>
						</TooltipSimple>
					</DialogTitle>
				</DialogHeader>
				<DialogCloseButton />
				{open && panel && panelId && (
					<ConfigProvider
						getPopupContainer={(): HTMLElement => contentRef.current ?? document.body}
					>
						<ViewPanelModalContent
							panel={panel}
							panelId={panelId}
							onClose={onClose}
						/>
					</ConfigProvider>
				)}
			</DialogContent>
		</Dialog>
	);
}

export default ViewPanelModal;
