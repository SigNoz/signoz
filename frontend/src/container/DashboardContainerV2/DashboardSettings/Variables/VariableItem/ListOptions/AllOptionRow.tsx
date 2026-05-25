import { Switch } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	allowAllValue: boolean;
	onChange: (v: boolean) => void;
}

function AllOptionRow({ allowAllValue, onChange }: Props): JSX.Element {
	return (
		<VariableItemRow className="all-option-section">
			<LabelContainer>
				<Typography className="typography-variables">
					Include an option for ALL values
				</Typography>
			</LabelContainer>
			<Switch
				checked={allowAllValue}
				onChange={onChange}
				data-testid="variable-allow-all-v2"
			/>
		</VariableItemRow>
	);
}

export default AllOptionRow;
