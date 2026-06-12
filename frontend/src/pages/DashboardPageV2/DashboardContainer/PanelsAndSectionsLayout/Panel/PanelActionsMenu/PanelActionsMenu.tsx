import { EllipsisVertical } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';

import type { PanelActionsConfig } from '../Panel';
import { usePanelActionItems } from './usePanelActionItems';
import styles from './PanelActionsMenu.module.scss';

interface PanelActionsMenuProps {
	panelId: string;
	/** Full plugin kind (e.g. `signoz/TimeSeriesPanel`); undefined when absent. */
	panelKind: string | undefined;
	/** Layout context for move/delete — absent outside editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * Purely presentational: the trigger button + dropdown. Which items appear —
 * and whether the menu renders at all — is owned by `usePanelActionItems`
 * (kind ∧ role ∧ context gating per action).
 */
function PanelActionsMenu({
	panelId,
	panelKind,
	panelActions,
}: PanelActionsMenuProps): JSX.Element | null {
	const items = usePanelActionItems({ panelId, panelKind, panelActions });

	if (items.length === 0) {
		return null;
	}

	return (
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
	);
}

export default PanelActionsMenu;
