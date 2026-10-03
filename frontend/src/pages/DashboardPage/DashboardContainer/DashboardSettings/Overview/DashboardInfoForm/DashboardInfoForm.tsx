import { Dispatch, SetStateAction } from 'react';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
// eslint-disable-next-line signoz/no-antd-components -- multiline TextArea has no @signozhq/ui equivalent yet
import { Input as AntdInput } from 'antd';
import TagKeyValueInput from 'components/TagKeyValueInput/TagKeyValueInput';

import DashboardImagePicker from '../DashboardImagePicker/DashboardImagePicker';
import { buildDefaultTimeRangeItems, DEFAULT_TIME_RANGE_UNSET } from '../utils';
import { DASHBOARD_NAME_MAX_LENGTH } from '../../../constants';
import settingsStyles from '../../DashboardSettings.module.scss';
import styles from './DashboardInfoForm.module.scss';

interface DashboardInfoFormProps {
	title: string;
	description: string;
	image: string;
	tags: string[];
	defaultTimeRange: string;
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onImageChange: (value: string) => void;
	onTagsChange: Dispatch<SetStateAction<string[]>>;
	onDefaultTimeRangeChange: (value: string) => void;
}

function DashboardInfoForm({
	title,
	description,
	image,
	tags,
	defaultTimeRange,
	onTitleChange,
	onDescriptionChange,
	onImageChange,
	onTagsChange,
	onDefaultTimeRangeChange,
}: DashboardInfoFormProps): JSX.Element {
	return (
		<div className={settingsStyles.settingsCard}>
			<div className={styles.formSpace}>
				<div className={styles.infoItemContainer}>
					<Typography className={styles.infoTitle}>Dashboard Name</Typography>
					<section className={styles.nameIconInput}>
						<DashboardImagePicker
							image={image}
							onChange={onImageChange}
							triggerClassName={styles.dashboardImageInput}
						/>

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
					<Typography className={styles.infoTitle}>Default time range</Typography>
					<section className={styles.defaultTimeRangeInput}>
						<SelectSimple
							className={styles.defaultTimeRangeSelect}
							testId="dashboard-default-time-range"
							items={buildDefaultTimeRangeItems(defaultTimeRange)}
							value={defaultTimeRange || DEFAULT_TIME_RANGE_UNSET}
							withPortal={false}
							onChange={(value): void =>
								onDefaultTimeRangeChange(
									value === DEFAULT_TIME_RANGE_UNSET ? '' : (value as string),
								)
							}
						/>
					</section>
					<Typography className={styles.infoHint}>
						Applies when a viewer opens the dashboard without a time range in the URL
						and has not picked one before.
					</Typography>
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
