import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { SolidInfoCircle } from '@signozhq/icons';

interface Props {
	name: string;
	description?: string;
}

/**
 * V1-style label: `$name` + an info tooltip if a description is set.
 * Mirrors [DashboardVariablesSelection/VariableItem.tsx:34-42](V1).
 */
function SelectorLabel({ name, description }: Props): JSX.Element {
	return (
		<Typography.Text className="variable-name" truncate={1}>
			${name}
			{description ? (
				<Tooltip title={description}>
					<SolidInfoCircle className="info-icon" size="md" />
				</Tooltip>
			) : null}
		</Typography.Text>
	);
}

export default SelectorLabel;
