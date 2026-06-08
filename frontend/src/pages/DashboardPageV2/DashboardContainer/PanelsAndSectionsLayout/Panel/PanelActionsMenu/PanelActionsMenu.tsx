import { useMemo } from 'react';
import { EllipsisVertical, FolderInput, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';

import type { DashboardSection } from '../../../utils';
import type { DeletePanelArgs } from '../hooks/useDeletePanel';
import type { MovePanelArgs } from '../hooks/useMovePanelToSection';
import styles from './PanelActionsMenu.module.scss';

interface PanelActionsMenuProps {
	panelId: string;
	currentLayoutIndex: number;
	sections: DashboardSection[];
	onMovePanel?: (args: MovePanelArgs) => void;
	onDeletePanel?: (args: DeletePanelArgs) => void;
}

function PanelActionsMenu({
	panelId,
	currentLayoutIndex,
	sections,
	onMovePanel,
	onDeletePanel,
}: PanelActionsMenuProps): JSX.Element {
	const items = useMemo<MenuItem[]>(() => {
		const result: MenuItem[] = [];

		if (onMovePanel) {
			const targets = sections.filter(
				(s) => s.title && s.layoutIndex !== currentLayoutIndex,
			);
			if (targets.length === 0) {
				result.push({
					key: 'move',
					label: 'Move to section',
					icon: <FolderInput size={14} />,
					disabled: true,
				});
			} else {
				result.push({
					key: 'move',
					label: 'Move to section',
					icon: <FolderInput size={14} />,
					children: targets.map((s) => ({
						key: `move-${s.layoutIndex}`,
						label: s.title,
						onClick: (): void =>
							onMovePanel({
								panelId,
								fromLayoutIndex: currentLayoutIndex,
								toLayoutIndex: s.layoutIndex,
							}),
					})),
				});
			}
		}

		if (onDeletePanel) {
			if (result.length > 0) {
				result.push({ type: 'divider' });
			}
			result.push({
				key: 'delete-panel',
				danger: true,
				icon: <Trash2 size={14} />,
				label: 'Delete panel',
				onClick: (): void =>
					onDeletePanel({ panelId, layoutIndex: currentLayoutIndex }),
			});
		}

		return result;
	}, [sections, currentLayoutIndex, panelId, onMovePanel, onDeletePanel]);

	return (
		<DropdownMenuSimple menu={{ items }}>
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
