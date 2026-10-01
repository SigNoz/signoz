import { useMemo } from 'react';
import { Ellipsis } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { type LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

interface ModelCostActionsMenuProps {
	rule: LlmpricingruletypesLLMPricingRuleDTO;
	canManage: boolean;
	onEdit: (rule: LlmpricingruletypesLLMPricingRuleDTO) => void;
	onDelete: (rule: LlmpricingruletypesLLMPricingRuleDTO) => void;
}

// Per-row kebab menu for the model-costs table. Only manage users get actions
// (Edit + Delete); view-only users have nothing to act on, so the cell stays
// empty rather than showing a single-item menu.
function ModelCostActionsMenu({
	rule,
	canManage,
	onEdit,
	onDelete,
}: ModelCostActionsMenuProps): JSX.Element | null {
	const menuItems = useMemo<DropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'edit',
				label: 'Edit',
				onClick: (): void => onEdit(rule),
			},
			{
				type: 'item',
				value: 'delete',
				label: 'Delete',
				danger: true,
				onClick: (): void => onDelete(rule),
			},
		],
		[onEdit, onDelete, rule],
	);

	if (!canManage) {
		return null;
	}

	return (
		<Dropdown items={menuItems} nativeButton align="end" side="bottom">
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				icon
				aria-label="Model cost actions"
				testId={`model-cost-actions-${rule.id}`}
			>
				<Ellipsis size={16} />
			</Button>
		</Dropdown>
	);
}

export default ModelCostActionsMenu;
