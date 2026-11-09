import { Dialog } from '@signozhq/ui/dialog';
import { ConfigProvider } from 'antd';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useRef } from 'react';

import ViewPanelModalContent from './ViewPanelModalContent';
import { useViewPanelTitle } from './useViewPanelTitle';

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
	// Render antd popups into the dialog panel (not document.body) so they stay inside
	// the modal's interactive, focus-trapped layer instead of being blocked by it.
	const contentRef = useRef<HTMLDivElement>(null);
	const title = useViewPanelTitle(panel);

	return (
		<Dialog
			ref={contentRef}
			open={open}
			onClose={(): void => onClose()}
			title={title}
			width="full"
		>
			{open && panel && panelId && (
				<ConfigProvider
					getPopupContainer={(): HTMLElement => contentRef.current ?? document.body}
				>
					<ViewPanelModalContent panel={panel} panelId={panelId} onClose={onClose} />
				</ConfigProvider>
			)}
		</Dialog>
	);
}

export default ViewPanelModal;
