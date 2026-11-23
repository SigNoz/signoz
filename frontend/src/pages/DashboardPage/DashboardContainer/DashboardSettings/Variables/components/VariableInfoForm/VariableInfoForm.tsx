import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
// eslint-disable-next-line signoz/no-antd-components -- multiline TextArea has no @signozhq/ui equivalent yet
import { Input as AntdInput } from 'antd';

import styles from './VariableInfoForm.module.scss';
import { DASHBOARD_NAME_MAX_LENGTH } from '../../../../constants';

interface VariableInfoFormProps {
	title: string;
	description: string;
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	visibleNameError: string | null;
}

function VariableInfoForm({
	title,
	description,
	onTitleChange,
	onDescriptionChange,
	visibleNameError,
}: VariableInfoFormProps): JSX.Element {
	return (
		<>
			<div className={styles.infoItemContainer}>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					Name
				</Typography>

				<Input
					testId="variable-name"
					value={title}
					maxLength={DASHBOARD_NAME_MAX_LENGTH}
					onChange={(e): void => onTitleChange(e.target.value)}
					placeholder="Unique name of the variable"
				/>

				{visibleNameError ? (
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="warning"
						as="span"
						textOverflow="wrap"
					>
						<sup>*</sup>&nbsp;
						{visibleNameError}
					</Typography>
				) : null}
			</div>

			<div className={styles.infoItemContainer}>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					Description
				</Typography>
				<AntdInput.TextArea
					className={styles.descriptionTextArea}
					value={description}
					placeholder="Enter a description for the variable"
					data-testid="dashboard-desc"
					rows={3}
					onChange={(e): void => onDescriptionChange(e.target.value)}
				/>
			</div>
		</>
	);
}

export default VariableInfoForm;
