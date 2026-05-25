import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	customAllValue: string;
	onChange: (v: string) => void;
}

function CustomAllValueRow({
	customAllValue,
	onChange,
}: Props): JSX.Element {
	return (
		<VariableItemRow className="custom-all-value-section">
			<LabelContainer>
				<Typography
					className="typography-variables"
					style={{ display: 'block' }}
				>
					Custom &quot;ALL&quot; value
				</Typography>
				<Typography
					className="default-value-description"
					style={{ display: 'block' }}
				>
					Literal value emitted when the user picks ALL (e.g. * or .*).
				</Typography>
			</LabelContainer>
			<Input
				value={customAllValue}
				placeholder="Leave blank to send the full union of values"
				onChange={(e): void => onChange(e.target.value)}
				style={{ width: 400 }}
				data-testid="variable-custom-all-value-v2"
			/>
		</VariableItemRow>
	);
}

export default CustomAllValueRow;
