import { Tag } from 'antd';
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
						<Tag key={`${v}${idx}`}>{v.toString()}</Tag>
					))
				)}
			</div>
		</VariableItemRow>
	);
}

export default PreviewValues;
