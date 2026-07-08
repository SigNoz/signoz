import { Dispatch, SetStateAction } from 'react';
import { Input } from '@signozhq/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
// eslint-disable-next-line signoz/no-antd-components -- multiline TextArea has no @signozhq/ui equivalent yet
import { Input as AntdInput } from 'antd';
import TagKeyValueInput from 'components/TagKeyValueInput/TagKeyValueInput';

import { Base64Icons } from '../utils';
import { DASHBOARD_NAME_MAX_LENGTH } from '../../../constants';
import settingsStyles from '../../DashboardSettings.module.scss';
import styles from './DashboardInfoForm.module.scss';

interface DashboardInfoFormProps {
	title: string;
	description: string;
	image: string;
	tags: string[];
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onImageChange: (value: string) => void;
	onTagsChange: Dispatch<SetStateAction<string[]>>;
}

function DashboardInfoForm({
	title,
	description,
	image,
	tags,
	onTitleChange,
	onDescriptionChange,
	onImageChange,
	onTagsChange,
}: DashboardInfoFormProps): JSX.Element {
	return (
		<div className={settingsStyles.settingsCard}>
			<div className={styles.formSpace}>
				<div className={styles.infoItemContainer}>
					<Typography className={styles.infoTitle}>Dashboard Name</Typography>
					<section className={styles.nameIconInput}>
						<Select
							value={image}
							onChange={(value): void => onImageChange(value as string)}
						>
							<SelectTrigger className={styles.dashboardImageInput} />
							<SelectContent
								className={styles.dashboardImageOptions}
								withPortal={false}
							>
								{Base64Icons.map((icon) => (
									<SelectItem
										key={icon}
										value={icon}
										className={styles.dashboardImageSelectItem}
									>
										<img
											src={icon}
											alt="dashboard-icon"
											className={styles.listItemImage}
										/>
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Input
							testId="dashboard-name"
							className={styles.dashboardNameInput}
							value={title}
							maxLength={DASHBOARD_NAME_MAX_LENGTH}
							onChange={(e): void => onTitleChange(e.target.value)}
						/>
					</section>
				</div>

				<div className={styles.infoItemContainer}>
					<Typography className={styles.infoTitle}>Description</Typography>
					<AntdInput.TextArea
						data-testid="dashboard-desc"
						rows={6}
						value={description}
						className={styles.descriptionTextArea}
						onChange={(e): void => onDescriptionChange(e.target.value)}
					/>
				</div>

				<div className={styles.infoItemContainer}>
					<Typography className={styles.infoTitle}>Tags</Typography>
					<TagKeyValueInput tags={tags} onTagsChange={onTagsChange} />
				</div>
			</div>
		</div>
	);
}

export default DashboardInfoForm;
