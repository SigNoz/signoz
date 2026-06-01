import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { LabelContainer, VariableItemRow } from '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	name: string;
	description: string;
	onNameChange: (v: string) => void;
	onDescriptionChange: (v: string) => void;
	nameError?: string;
}

function NameDisplay({
	name,
	description,
	onNameChange,
	onDescriptionChange,
	nameError,
}: Props): JSX.Element {
	return (
		<>
			<VariableItemRow className="variable-name-section">
				<LabelContainer>
					<Typography className="typography-variables">Name</Typography>
				</LabelContainer>
				<div>
					<Input
						placeholder="Unique name of the variable"
						value={name}
						className="name-input"
						onChange={(e): void => onNameChange(e.target.value)}
						data-testid="variable-name-v2"
					/>
					{nameError ? (
						<div>
							<Typography.Text color="warning">{nameError}</Typography.Text>
						</div>
					) : null}
				</div>
			</VariableItemRow>
			<VariableItemRow className="variable-description-section">
				<LabelContainer>
					<Typography className="typography-variables">Description</Typography>
				</LabelContainer>
				<Input.TextArea
					value={description}
					placeholder="Enter a description for the variable"
					className="description-input"
					rows={3}
					onChange={(e): void => onDescriptionChange(e.target.value)}
					data-testid="variable-description-v2"
				/>
			</VariableItemRow>
		</>
	);
}

export default NameDisplay;
