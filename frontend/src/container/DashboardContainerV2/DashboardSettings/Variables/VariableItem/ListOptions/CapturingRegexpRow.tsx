import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	capturingRegexp: string;
	onChange: (v: string) => void;
}

function CapturingRegexpRow({
	capturingRegexp,
	onChange,
}: Props): JSX.Element {
	return (
		<VariableItemRow className="capturing-regexp-section">
			<LabelContainer>
				<Typography
					className="typography-variables"
					style={{ display: 'block' }}
				>
					Capturing regex
				</Typography>
				<Typography
					className="default-value-description"
					style={{ display: 'block' }}
				>
					Regex applied to each value; the first capture group becomes the
					selectable option.
				</Typography>
			</LabelContainer>
			<Input
				value={capturingRegexp}
				placeholder="e.g. env-(.*)-\\d+"
				onChange={(e): void => onChange(e.target.value)}
				style={{ width: 400 }}
				data-testid="variable-capturing-regexp-v2"
			/>
		</VariableItemRow>
	);
}

export default CapturingRegexpRow;
