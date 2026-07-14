import { EllipsisVertical } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import ConfirmDeleteDialog from '../../../components/ConfirmDeleteDialog/ConfirmDeleteDialog';
import type { PanelActionsConfig } from '../Panel';
import { usePanelActionItems } from './usePanelActionItems';
import styles from './PanelActionsMenu.module.scss';

interface PanelActionsMenuProps {
	panelId: string;
	/** The panel itself — seeds "Create Alerts" and the download filename. */
	panel: DashboardtypesPanelDTO;
	/** The panel's query response — the source for "Download as CSV". */
	data: PanelQueryData;
	/** Layout context for move/delete — absent outside editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * Purely presentational: the trigger button + dropdown, plus the delete
 * confirmation dialog. Which items appear — and the delete-confirm state — is
 * owned by `usePanelActionItems` (kind ∧ role ∧ context gating per action).
 */
function PanelActionsMenu({
	panelId,
	panel,
	data,
	panelActions,
}: PanelActionsMenuProps): JSX.Element | null {
	const { items, deleteConfirm } = usePanelActionItems({
		panelId,
		panel,
		data,
		panelActions,
	});

	if (items.length === 0) {
		return null;
	}

	return (
		<>
			<DropdownMenuSimple menu={{ items }} align="end">
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					className={styles.trigger}
					aria-label="Panel actions"
					data-testid={`panel-actions-${panelId}`}
					// Stop pointer/mouse down from reaching the RGL drag handle this
					// button lives inside, so opening the menu never starts a panel drag.
					onPointerDown={(e): void => e.stopPropagation()}
					onMouseDown={(e): void => e.stopPropagation()}
					onClick={(e): void => e.stopPropagation()}
				>
					<EllipsisVertical size={14} />
				</Button>
			</DropdownMenuSimple>
			<ConfirmDeleteDialog
				open={deleteConfirm.open}
				title="Delete panel?"
				description="This panel will be removed from the dashboard. This action cannot be undone."
				isLoading={deleteConfirm.isPending}
				onConfirm={deleteConfirm.confirm}
				onClose={deleteConfirm.cancel}
			/>
		</>
	);
}

export default PanelActionsMenu;
