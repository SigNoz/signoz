import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { orange } from '@ant-design/colors';

import { LabelContainer, VariableItemRow } from '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	previewValues: string[];
	error?: string | null;
}

function PreviewValues({ previewValues, error }: Props): JSX.Element {
	return (
		<VariableItemRow className="variables-preview-section">
			<LabelContainer style={{ width: '100%' }}>
				<Typography className="typography-variables">
					Preview of Values
				</Typography>
			</LabelContainer>
			<div className="preview-values">
				{error ? (
					<Typography style={{ color: orange[5] }}>{error}</Typography>
				) : (
					previewValues.map((v, idx) => (
						<Badge key={`${v}${idx}`}>{v.toString()}</Badge>
					))
				)}
			</div>
		</VariableItemRow>
	);
}

export default PreviewValues;
