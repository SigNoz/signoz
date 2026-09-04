import { type ReactNode, useMemo } from 'react';
import { Copy, EllipsisVertical, PenLine, Plus, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';

import type { DisabledState } from 'lib/authz/components/DisabledReasonTooltip/disabledState.types';
import DisabledMenuItemLabel from '../../../components/DisabledMenuItemLabel/DisabledMenuItemLabel';
import styles from './SectionActionsMenu.module.scss';

interface SectionActionsMenuProps {
	sectionId: string;
	/** Present when edits are unavailable — items render disabled with its reason. */
	disabled?: DisabledState;
	onAddPanel?: () => void;
	onRename?: () => void;
	onCloneSection?: () => void;
	onDeleteSection?: () => void;
}

function SectionActionsMenu({
	sectionId,
	disabled,
	onAddPanel,
	onRename,
	onCloneSection,
	onDeleteSection,
}: SectionActionsMenuProps): JSX.Element {
	const items = useMemo<MenuItem[]>(() => {
		const isDisabled = !!disabled;
		const label = (text: string): ReactNode =>
			disabled ? (
				<DisabledMenuItemLabel reason={disabled.reason} kind={disabled.kind}>
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
				disabled: isDisabled,
				onClick: onAddPanel,
			});
		}
		if (onRename) {
			result.push({
				key: 'rename',
				icon: <PenLine size={14} />,
				label: label('Rename section'),
				disabled: isDisabled,
				onClick: onRename,
			});
		}
		if (onCloneSection) {
			result.push({
				key: 'clone-section',
				icon: <Copy size={14} />,
				label: label('Clone section'),
				disabled: isDisabled,
				onClick: onCloneSection,
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
					disabled: isDisabled,
					onClick: onDeleteSection,
				},
			);
		}
		return result;
	}, [disabled, onAddPanel, onRename, onCloneSection, onDeleteSection]);

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
