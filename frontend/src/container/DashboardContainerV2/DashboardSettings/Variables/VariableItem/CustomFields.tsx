import { Collapse, Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { VariableItemRow } from '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	customValue: string;
	onChange: (v: string) => void;
	error?: string;
}

function CustomFields({ customValue, onChange, error }: Props): JSX.Element {
	return (
		<VariableItemRow className="variable-custom-section">
			<Collapse
				collapsible="header"
				rootClassName="custom-collapse"
				defaultActiveKey={['1']}
				items={[
					{
						key: '1',
						label: 'Options',
						children: (
							<>
								<Input.TextArea
									value={customValue}
									placeholder="Enter options separated by commas."
									rootClassName="comma-input"
									onChange={(e): void => onChange(e.target.value)}
									data-testid="variable-custom-value-v2"
								/>
								{error ? (
									<div>
										<Typography.Text color="warning">{error}</Typography.Text>
									</div>
								) : null}
							</>
						),
					},
				]}
			/>
		</VariableItemRow>
	);
}

export default CustomFields;
