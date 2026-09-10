import { type ReactElement, type ReactNode, useMemo } from 'react';
import { Copy, EllipsisVertical, PenLine, Plus, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';

import MenuActionItem from '../../../components/MenuActionItem/MenuActionItem';
import styles from './SectionActionsMenu.module.scss';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

interface SectionActionsMenuProps {
	sectionId: string;
	/** Present when edits are unavailable — items render disabled with its reason. */
	disabledChecks?: BrandedPermission[];
	disabledTooltip?: string;
	disabled?: boolean;
	onAddPanel?: () => void;
	onRename?: () => void;
	onCloneSection?: () => void;
	onDeleteSection?: () => void;
}

function SectionActionsMenu({
	sectionId,
	disabledChecks = [],
	disabledTooltip,
	disabled = false,
	onAddPanel,
	onRename,
	onCloneSection,
	onDeleteSection,
}: SectionActionsMenuProps): JSX.Element {
	const items = useMemo<MenuItem[]>(() => {
		// The row is a button, so it carries its own icon, disabled state and
		// reason — the dropdown item just hosts it.
		const row = (text: string, icon: ReactElement): ReactNode => (
			<MenuActionItem
				label={text}
				icon={icon}
				checks={disabledChecks}
				disabledTooltip={disabledTooltip}
			/>
		);
		const result: MenuItem[] = [];
		if (onAddPanel) {
			result.push({
				key: 'add-panel',
				label: row('Add panel', <Plus size={14} />),
				disabled,
				onClick: onAddPanel,
			});
		}
		if (onRename) {
			result.push({
				key: 'rename',
				label: row('Rename section', <PenLine size={14} />),
				disabled,
				onClick: onRename,
			});
		}
		if (onCloneSection) {
			result.push({
				key: 'clone-section',
				label: row('Clone section', <Copy size={14} />),
				disabled,
				onClick: onCloneSection,
			});
		}
		if (onDeleteSection) {
			result.push(
				{ type: 'divider' },
				{
					key: 'delete-section',
					danger: true,
					label: row('Delete section', <Trash2 size={14} />),
					disabled,
					onClick: onDeleteSection,
				},
			);
		}
		return result;
	}, [
		disabled,
		disabledChecks,
		disabledTooltip,
		onAddPanel,
		onRename,
		onCloneSection,
		onDeleteSection,
	]);

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
