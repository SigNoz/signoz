import { Dialog } from '@signozhq/ui/dialog';
import { ConfigProvider } from 'antd';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useRef } from 'react';

import ViewPanelModalContent from './ViewPanelModalContent';
import { useViewPanelTitle } from './useViewPanelTitle';

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
	// Render antd popups inside the dialog (not document.body) so they stay inside
	// the modal's interactive, focus-trapped layer instead of being blocked by it.
	const surfaceRef = useRef<HTMLDivElement>(null);
	const title = useViewPanelTitle(panel);

	return (
		<Dialog
			open={open}
			onClose={(): void => onClose()}
			title={title}
			width="full"
		>
			{open && panel && panelId && (
				<div ref={surfaceRef} className={styles.surface}>
					<ConfigProvider
						getPopupContainer={(): HTMLElement => surfaceRef.current ?? document.body}
					>
						<ViewPanelModalContent
							panel={panel}
							panelId={panelId}
							onClose={onClose}
						/>
					</ConfigProvider>
				</div>
			)}
		</Dialog>
	);
}

export default ViewPanelModal;
