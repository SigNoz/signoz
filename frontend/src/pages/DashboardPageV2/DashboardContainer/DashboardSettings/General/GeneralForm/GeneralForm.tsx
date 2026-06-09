import { Dispatch, SetStateAction } from 'react';
// eslint-disable-next-line signoz/no-antd-components -- TODO: migrate Select/Input to @signozhq/ui
import { Col, Input, Select, Space } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import AddTags from 'container/DashboardContainer/DashboardSettings/General/AddBadges';

import { Base64Icons } from '../utils';
import styles from '../GeneralSettings.module.scss';

const { Option } = Select;

interface GeneralFormProps {
	title: string;
	description: string;
	image: string;
	tags: string[];
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onImageChange: (value: string) => void;
	onTagsChange: Dispatch<SetStateAction<string[]>>;
}

function GeneralForm({
	title,
	description,
	image,
	tags,
	onTitleChange,
	onDescriptionChange,
	onImageChange,
	onTagsChange,
}: GeneralFormProps): JSX.Element {
	return (
		<Col className={styles.overviewSettings}>
			<Space direction="vertical" className={styles.formSpace}>
				<div>
					<Typography className={styles.dashboardName}>Dashboard Name</Typography>
					<section className={styles.nameIconInput}>
						<Select
							defaultActiveFirstOption
							data-testid="dashboard-image"
							suffixIcon={null}
							rootClassName={styles.dashboardImageInput}
							value={image}
							onChange={onImageChange}
						>
							{Base64Icons.map((icon) => (
								<Option value={icon} key={icon}>
									<img
										src={icon}
										alt="dashboard-icon"
										className={styles.listItemImage}
									/>
								</Option>
							))}
						</Select>
						<Input
							data-testid="dashboard-name"
							className={styles.dashboardNameInput}
							value={title}
							onChange={(e): void => onTitleChange(e.target.value)}
						/>
					</section>
				</div>

				<div>
					<Typography className={styles.dashboardName}>Description</Typography>
					<Input.TextArea
						data-testid="dashboard-desc"
						rows={6}
						value={description}
						className={styles.descriptionTextArea}
						onChange={(e): void => onDescriptionChange(e.target.value)}
					/>
				</div>
				<div>
					<Typography className={styles.dashboardName}>Tags</Typography>
					<AddTags tags={tags} setTags={onTagsChange} />
				</div>
			</Space>
		</Col>
	);
}

export default GeneralForm;
