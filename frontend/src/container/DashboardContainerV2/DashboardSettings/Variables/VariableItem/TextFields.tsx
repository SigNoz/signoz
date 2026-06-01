import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	textValue: string;
	onChange: (v: string) => void;
	error?: string;
}

function TextFields({ textValue, onChange, error }: Props): JSX.Element {
	return (
		<VariableItemRow className="variable-textbox-section">
			<LabelContainer>
				<Typography className="typography-variables">Default Value</Typography>
			</LabelContainer>
			<div>
				<Input
					value={textValue}
					className="default-input"
					onChange={(e): void => onChange(e.target.value)}
					placeholder="Enter a default value (if any)..."
					style={{ width: 400 }}
					data-testid="variable-text-value-v2"
				/>
				{error ? (
					<div>
						<Typography.Text color="warning">{error}</Typography.Text>
					</div>
				) : null}
			</div>
		</VariableItemRow>
	);
}

export default TextFields;
