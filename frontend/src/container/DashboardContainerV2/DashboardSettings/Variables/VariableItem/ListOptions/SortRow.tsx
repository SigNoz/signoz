import { Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';
import { SORT_OPTIONS } from '../../types';

interface Props {
	sort: string;
	onChange: (v: string) => void;
}

function SortRow({ sort, onChange }: Props): JSX.Element {
	return (
		<VariableItemRow className="sort-values-section">
			<LabelContainer>
				<Typography className="typography-variables">Sort Values</Typography>
			</LabelContainer>
			<Select
				value={sort}
				onChange={onChange}
				options={SORT_OPTIONS}
				className="sort-input"
				data-testid="variable-sort-v2"
			/>
		</VariableItemRow>
	);
}

export default SortRow;
