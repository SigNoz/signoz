import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Col, Input, Radio, Select, Space, Typography } from 'antd';
import AddTags from 'container/DashboardContainer/DashboardSettings/General/AddTags';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { isEqual } from 'lodash-es';
import { Check, X } from 'lucide-react';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';

import { Button } from './styles';
import { Base64Icons } from './utils';

import './GeneralSettings.styles.scss';

const { Option } = Select;

function GeneralDashboardSettings(): JSX.Element {
	const { dashboardData, setDashboardData } = useDashboardStore();

	const updateDashboardMutation = useUpdateDashboard();

	const [cursorSyncMode, setCursorSyncMode] = useDashboardCursorSyncMode(
		dashboardData?.id,
	);

	const selectedData = dashboardData?.data;

	const {
		title = '',
		tags = [],
		description = '',
		image = Base64Icons[0],
	} = selectedData || {};

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [updatedTags, setUpdatedTags] = useState<string[]>(tags || []);
	const [updatedDescription, setUpdatedDescription] = useState(
		description || '',
	);
	const [updatedImage, setUpdatedImage] = useState<string>(image);
	const [numberOfUnsavedChanges, setNumberOfUnsavedChanges] =
		useState<number>(0);

	const { t } = useTranslation('common');

	const onSaveHandler = (): void => {
		if (!dashboardData) {
			return;
		}

		updateDashboardMutation.mutate(
			{
				id: dashboardData.id,
				data: {
					...dashboardData.data,
					description: updatedDescription,
					tags: updatedTags,
					title: updatedTitle,
					image: updatedImage,
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (updatedDashboard.data) {
						setDashboardData(updatedDashboard.data);
					}
				},
				onError: () => {},
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
			<Col className="overview-settings cross-panel-sync">
				<div className="cross-panel-sync__info">
					<Typography.Text className="cross-panel-sync__title">
						Cross-Panel Sync
					</Typography.Text>
					<Typography.Text className="cross-panel-sync__description">
						Sync crosshair and tooltip across all the dashboard panels
					</Typography.Text>
				</div>
				<Radio.Group
					value={cursorSyncMode}
					onChange={(e): void => {
						setCursorSyncMode(e.target.value as DashboardCursorSync);
					}}
				>
					<Radio.Button value={DashboardCursorSync.None}>No Sync</Radio.Button>
					<Radio.Button value={DashboardCursorSync.Crosshair}>
						Crosshair
					</Radio.Button>
					<Radio.Button value={DashboardCursorSync.Tooltip}>Tooltip</Radio.Button>
				</Radio.Group>
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
