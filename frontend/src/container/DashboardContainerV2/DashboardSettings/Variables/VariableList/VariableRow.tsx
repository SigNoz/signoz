import { Button, Space } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { PenLine, Trash2 } from '@signozhq/icons';

interface Props {
	description: string;
	kindLabel: string;
	onEdit: () => void;
	onDelete: () => void;
}

/**
 * Right cell of the variable table — description text + edit/delete actions.
 * Variable name + kind tag render in the left cell via column config.
 */
function VariableRow({
	description,
	kindLabel,
	onEdit,
	onDelete,
}: Props): JSX.Element {
	return (
		<div className="variable-description-actions">
			<Typography.Text className="variable-description">
				{description}
			</Typography.Text>
			<Space className="actions-btns">
				<Badge color="sienna" variant="outline">
					{kindLabel}
				</Badge>
				<Button
					type="text"
					onClick={onEdit}
					className="edit-variable-button"
					data-testid="variable-edit-v2"
				>
					<PenLine size={14} />
				</Button>
				<Button
					type="text"
					onClick={onDelete}
					className="delete-variable-button"
					data-testid="variable-delete-v2"
				>
					<Trash2 size={14} />
				</Button>
			</Space>
		</div>
	);
}

export default VariableRow;
