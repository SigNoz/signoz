import { useMemo } from 'react';
import { EllipsisVertical, PenLine, Plus, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';

import styles from './SectionActionsMenu.module.scss';

interface SectionActionsMenuProps {
	sectionId: string;
	onAddPanel?: () => void;
	onRename?: () => void;
	onDeleteSection?: () => void;
}

function SectionActionsMenu({
	sectionId,
	onAddPanel,
	onRename,
	onDeleteSection,
}: SectionActionsMenuProps): JSX.Element {
	const items = useMemo<MenuItem[]>(() => {
		const result: MenuItem[] = [];
		if (onAddPanel) {
			result.push({
				key: 'add-panel',
				icon: <Plus size={14} />,
				label: 'Add panel',
				onClick: onAddPanel,
			});
		}
		if (onRename) {
			result.push({
				key: 'rename',
				icon: <PenLine size={14} />,
				label: 'Rename section',
				onClick: onRename,
			});
		}
		if (onDeleteSection) {
			result.push(
				{ type: 'divider' },
				{
					key: 'delete-section',
					danger: true,
					icon: <Trash2 size={14} />,
					label: 'Delete section',
					onClick: onDeleteSection,
				},
			);
		}
		return result;
	}, [onAddPanel, onRename, onDeleteSection]);

	return (
		<DropdownMenuSimple menu={{ items }}>
			<Button
				type="button"
				variant="ghost"
				color="secondary"
				size="icon"
				className={styles.trigger}
				aria-label="Section actions"
				data-testid={`dashboard-section-actions-${sectionId}`}
			>
				<EllipsisVertical size={14} />
			</Button>
		</DropdownMenuSimple>
	);
}

export default SectionActionsMenu;
