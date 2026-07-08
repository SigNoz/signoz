import { type ReactNode, useMemo } from 'react';
import { EllipsisVertical, PenLine, Plus, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';

import DisabledMenuItemLabel from '../../../components/DisabledMenuItemLabel/DisabledMenuItemLabel';
import styles from './SectionActionsMenu.module.scss';

interface SectionActionsMenuProps {
	sectionId: string;
	/** Non-empty when edits are unavailable — items render disabled with this reason. */
	disabledReason?: string;
	onAddPanel?: () => void;
	onRename?: () => void;
	onDeleteSection?: () => void;
}

function SectionActionsMenu({
	sectionId,
	disabledReason = '',
	onAddPanel,
	onRename,
	onDeleteSection,
}: SectionActionsMenuProps): JSX.Element {
	const items = useMemo<MenuItem[]>(() => {
		const disabled = !!disabledReason;
		const label = (text: string): ReactNode =>
			disabled ? (
				<DisabledMenuItemLabel reason={disabledReason}>
					{text}
				</DisabledMenuItemLabel>
			) : (
				text
			);
		const result: MenuItem[] = [];
		if (onAddPanel) {
			result.push({
				key: 'add-panel',
				icon: <Plus size={14} />,
				label: label('Add panel'),
				disabled,
				onClick: onAddPanel,
			});
		}
		if (onRename) {
			result.push({
				key: 'rename',
				icon: <PenLine size={14} />,
				label: label('Rename section'),
				disabled,
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
					label: label('Delete section'),
					disabled,
					onClick: onDeleteSection,
				},
			);
		}
		return result;
	}, [disabledReason, onAddPanel, onRename, onDeleteSection]);

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
