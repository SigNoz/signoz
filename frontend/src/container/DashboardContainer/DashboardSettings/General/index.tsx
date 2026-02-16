import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Col, Input, Radio, Select, Space, Typography } from 'antd';
import AddTags from 'container/DashboardContainer/DashboardSettings/General/AddTags';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { isEqual } from 'lodash-es';
import { Check, X } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	CROSS_PANEL_SYNC_OPTIONS,
	CrossPanelSync,
} from 'types/api/dashboard/getAll';

import { Button } from './styles';
import { Base64Icons } from './utils';

import './GeneralSettings.styles.scss';

const { Option } = Select;

function GeneralDashboardSettings(): JSX.Element {
	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const updateDashboardMutation = useUpdateDashboard();

	const selectedData = selectedDashboard?.data;

	const {
		title = '',
		tags = [],
		description = '',
		image = Base64Icons[0],
		crossPanelSync = 'NONE',
	} = selectedData || {};

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [updatedTags, setUpdatedTags] = useState<string[]>(tags || []);
	const [updatedDescription, setUpdatedDescription] = useState(
		description || '',
	);
	const [updatedImage, setUpdatedImage] = useState<string>(image);
	const [
		updatedCrossPanelSync,
		setUpdatedCrossPanelSync,
	] = useState<CrossPanelSync>(crossPanelSync);
	const [numberOfUnsavedChanges, setNumberOfUnsavedChanges] = useState<number>(
		0,
	);

	const { t } = useTranslation('common');

	const onSaveHandler = (): void => {
		if (!selectedDashboard) {
			return;
		}

		updateDashboardMutation.mutate(
			{
				id: selectedDashboard.id,
				data: {
					...selectedDashboard.data,
					description: updatedDescription,
					tags: updatedTags,
					title: updatedTitle,
					image: updatedImage,
					crossPanelSync: updatedCrossPanelSync,
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (updatedDashboard.data) {
						setSelectedDashboard(updatedDashboard.data);
					}
				},
				onError: () => {},
			},
		);
	};

	useEffect(() => {
		let numberOfUnsavedChanges = 0;
		const initialValues = [title, description, tags, image, crossPanelSync];
		const updatedValues = [
			updatedTitle,
			updatedDescription,
			updatedTags,
			updatedImage,
			updatedCrossPanelSync,
		];
		initialValues.forEach((val, index) => {
			if (!isEqual(val, updatedValues[index])) {
				numberOfUnsavedChanges += 1;
			}
		});
		setNumberOfUnsavedChanges(numberOfUnsavedChanges);
	}, [
		crossPanelSync,
		description,
		image,
		tags,
		title,
		updatedCrossPanelSync,
		updatedDescription,
		updatedImage,
		updatedTags,
		updatedTitle,
	]);

	const crossPanelSyncOptions = useMemo(() => {
		return CROSS_PANEL_SYNC_OPTIONS.map((value) => {
			const sanitizedValue = value.toLowerCase();
			const label =
				sanitizedValue === 'none'
					? 'No Sync'
					: sanitizedValue.charAt(0).toUpperCase() + sanitizedValue.slice(1);
			return {
				label,
				value,
			};
		});
	}, []);

	const discardHandler = (): void => {
		setUpdatedTitle(title);
		setUpdatedImage(image);
		setUpdatedTags(tags);
		setUpdatedDescription(description);
		setUpdatedCrossPanelSync(crossPanelSync);
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
			<Col className="overview-settings">
				<div className="cross-panel-sync-section">
					<div className="cross-panel-sync-info">
						<Typography className="cross-panel-sync-title">
							Cross-Panel Sync
						</Typography>
						<Typography.Text className="cross-panel-sync-description">
							Sync crosshair and tooltip across all the dashboard panels
						</Typography.Text>
					</div>
					<Radio.Group
						value={updatedCrossPanelSync}
						onChange={(e): void =>
							setUpdatedCrossPanelSync(e.target.value as CrossPanelSync)
						}
						optionType="button"
						buttonStyle="solid"
						options={crossPanelSyncOptions}
						data-testid="cross-panel-sync"
					/>
				</div>
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
