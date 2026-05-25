import { Switch } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	allowMultiple: boolean;
	onChange: (v: boolean) => void;
}

function MultiSelectRow({ allowMultiple, onChange }: Props): JSX.Element {
	return (
		<VariableItemRow className="multiple-values-section">
			<LabelContainer>
				<Typography className="typography-variables">
					Enable multiple values to be checked
				</Typography>
			</LabelContainer>
			<Switch
				checked={allowMultiple}
				onChange={onChange}
				data-testid="variable-allow-multiple-v2"
			/>
		</VariableItemRow>
	);
}

export default MultiSelectRow;
