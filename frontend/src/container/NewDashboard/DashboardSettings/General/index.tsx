import './GeneralSettings.styles.scss';

import { Col, Input, Select, Space, Typography } from 'antd';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import AddTags from 'container/NewDashboard/DashboardSettings/General/AddTags';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { isEqual } from 'lodash-es';
import { Check, X } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from './styles';
import { Base64Icons } from './utils';

const { Option } = Select;

function GeneralDashboardSettings(): JSX.Element {
	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const updateDashboardMutation = useUpdateDashboard();

	const selectedData = selectedDashboard?.data;

	const { title = '', tags = [], description = '', image = Base64Icons[0] } =
		selectedData || {};

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [updatedTags, setUpdatedTags] = useState<string[]>(tags || []);
	const [updatedDescription, setUpdatedDescription] = useState(
		description || '',
	);
	const [updatedImage, setUpdatedImage] = useState<string>(image);
	const [numberOfUnsavedChanges, setNumberOfUnsavedChanges] = useState<number>(
		0,
	);

	const { t } = useTranslation('common');

	const { notifications } = useNotifications();

	const onSaveHandler = (): void => {
		if (!selectedDashboard) return;

		updateDashboardMutation.mutateAsync(
			{
				...selectedDashboard,
				data: {
					...selectedDashboard.data,
					description: updatedDescription,
					tags: updatedTags,
					title: updatedTitle,
					image: updatedImage,
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (updatedDashboard.payload) {
						setSelectedDashboard(updatedDashboard.payload);
					}
				},
				onError: () => {
					notifications.error({
						message: SOMETHING_WENT_WRONG,
					});
				},
			},
		);
	};

	useEffect(() => {
		let numberOfUnsavedChanges = 0;
		const initialValues = [title, description, tags, image];
		const updatedValues = [
			updatedTitle,
			updatedDescription,
			updatedTags,
			updatedImage,
		];
		initialValues.forEach((val, index) => {
			if (!isEqual(val, updatedValues[index])) {
				numberOfUnsavedChanges += 1;
			}
		});
		setNumberOfUnsavedChanges(numberOfUnsavedChanges);
	}, [
		description,
		image,
		tags,
		title,
		updatedDescription,
		updatedImage,
		updatedTags,
		updatedTitle,
	]);

	const discardHandler = (): void => {
		setUpdatedTitle(title);
		setUpdatedImage(image);
		setUpdatedTags(tags);
		setUpdatedDescription(description);
	};

	return (
		<div className="overview-content">
			<Col className="overview-settings">
				<Space
					direction="vertical"
					style={{
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						gap: '21px',
					}}
				>
					<div>
						<Typography style={{ marginBottom: '0.5rem' }} className="dashboard-name">
							Dashboard Name
						</Typography>
						<section className="name-icon-input">
							<Select
								defaultActiveFirstOption
								data-testid="dashboard-image"
								suffixIcon={null}
								rootClassName="dashboard-image-input"
								value={updatedImage}
								onChange={(value: string): void => setUpdatedImage(value)}
							>
								{Base64Icons.map((icon) => (
									<Option value={icon} key={icon}>
										<img src={icon} alt="dashboard-icon" className="list-item-image" />
									</Option>
								))}
							</Select>
							<Input
								data-testid="dashboard-name"
								className="dashboard-name-input"
								value={updatedTitle}
								onChange={(e): void => setUpdatedTitle(e.target.value)}
							/>
						</section>
					</div>

					<div>
						<Typography style={{ marginBottom: '0.5rem' }} className="dashboard-name">
							Description
						</Typography>
						<Input.TextArea
							data-testid="dashboard-desc"
							rows={6}
							value={updatedDescription}
							className="description-text-area"
							onChange={(e): void => setUpdatedDescription(e.target.value)}
						/>
					</div>
					<div>
						<Typography style={{ marginBottom: '0.5rem' }} className="dashboard-name">
							Tags
						</Typography>
						<AddTags tags={updatedTags} setTags={setUpdatedTags} />
					</div>
				</Space>
			</Col>
			{numberOfUnsavedChanges > 0 && (
				<div className="overview-settings-footer">
					<div className="unsaved">
						<div className="unsaved-dot" />
						<Typography.Text className="unsaved-changes">
							{numberOfUnsavedChanges} unsaved change
							{numberOfUnsavedChanges > 1 && 's'}
						</Typography.Text>
					</div>
					<div className="footer-action-btns">
						<Button
							disabled={updateDashboardMutation.isLoading}
							icon={<X size={14} />}
							onClick={discardHandler}
							type="text"
							className="discard-btn"
						>
							Discard
						</Button>
						<Button
							style={{
								margin: '16px 0',
							}}
							disabled={updateDashboardMutation.isLoading}
							loading={updateDashboardMutation.isLoading}
							icon={<Check size={14} />}
							data-testid="save-dashboard-config"
							onClick={onSaveHandler}
							type="primary"
							className="save-btn"
						>
							{t('save')}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default GeneralDashboardSettings;
