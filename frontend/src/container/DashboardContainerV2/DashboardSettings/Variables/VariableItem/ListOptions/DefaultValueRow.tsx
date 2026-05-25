import CustomSelect from 'components/NewSelect/CustomSelect';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';
import type { V2VariableKind } from '../../types';

interface Props {
	kind: V2VariableKind;
	defaultValue: string;
	previewValues: string[];
	onChange: (v: string) => void;
}

function DefaultValueRow({
	kind,
	defaultValue,
	previewValues,
	onChange,
}: Props): JSX.Element {
	const description =
		kind === 'QUERY'
			? 'Click Test Run Query to see the values or add custom value'
			: 'Select a value from the preview values or add custom value';

	return (
		<VariableItemRow className="default-value-section">
			<LabelContainer>
				<Typography className="typography-variables">Default Value</Typography>
				<Typography className="default-value-description">
					{description}
				</Typography>
			</LabelContainer>
			<CustomSelect
				placeholder="Select a default value"
				value={defaultValue}
				onChange={(v): void => onChange((v as string) ?? '')}
				options={previewValues.map((v) => ({ label: v, value: v }))}
			/>
		</VariableItemRow>
	);
}

export default DefaultValueRow;
