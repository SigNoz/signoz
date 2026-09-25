import { useMemo } from 'react';
import { Copy, EllipsisVertical, PenLine, Plus, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import { blockedBy } from 'lib/authz/components/AuthZDropdown/utils';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

interface SectionActionsMenuProps {
	sectionId: string;
	/** Present when edits are unavailable — items render disabled with its reason. */
	disabledChecks?: BrandedPermission[];
	disabledTooltip?: string;
	onAddPanel?: () => void;
	onRename?: () => void;
	onCloneSection?: () => void;
	onDeleteSection?: () => void;
}

function SectionActionsMenu({
	sectionId,
	disabledChecks = [],
	disabledTooltip = '',
	onAddPanel,
	onRename,
	onCloneSection,
	onDeleteSection,
}: SectionActionsMenuProps): JSX.Element {
	const items = useMemo<AuthZDropdownItemType[]>(() => {
		const gate = { checks: disabledChecks, ...blockedBy(disabledTooltip) };
		const result: AuthZDropdownItemType[] = [];
		if (onAddPanel) {
			result.push({
				type: 'item',
				value: 'add-panel',
				label: 'Add panel',
				prefix: <Plus size={14} />,
				...gate,
				onClick: onAddPanel,
			});
		}
		if (onRename) {
			result.push({
				type: 'item',
				value: 'rename',
				label: 'Rename section',
				prefix: <PenLine size={14} />,
				...gate,
				onClick: onRename,
			});
		}
		if (onCloneSection) {
			result.push({
				type: 'item',
				value: 'clone-section',
				label: 'Clone section',
				prefix: <Copy size={14} />,
				...gate,
				onClick: onCloneSection,
			});
		}
		if (onDeleteSection) {
			result.push(
				{ type: 'separator', value: 'before-delete-section' },
				{
					type: 'item',
					value: 'delete-section',
					label: 'Delete section',
					prefix: <Trash2 size={14} />,
					danger: true,
					...gate,
					onClick: onDeleteSection,
				},
			);
		}
		return result;
	}, [
		disabledChecks,
		disabledTooltip,
		onAddPanel,
		onRename,
		onCloneSection,
		onDeleteSection,
	]);

	return (
		<AuthZDropdown
			items={items}
			nativeButton
			align="end"
			side="bottom"
			testId={`dashboard-section-actions-${sectionId}`}
		>
			<Button
				type="button"
				variant="ghost"
				color="secondary"
				size="sm"
				icon
				aria-label="Section actions"
			>
				<EllipsisVertical size={14} />
			</Button>
		</AuthZDropdown>
	);
}

export default SectionActionsMenu;
