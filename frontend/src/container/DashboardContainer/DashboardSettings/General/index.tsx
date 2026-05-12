import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Col, Input, Radio, Select, Space, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import AddTags from 'container/DashboardContainer/DashboardSettings/General/AddTags';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { isEqual } from 'lodash-es';
import { Check, ExternalLink, Info, X } from '@signozhq/icons';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';

import styles from './GeneralSettings.module.scss';
import { Button } from './styles';
import { Base64Icons } from './utils';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';
import { getAbsoluteUrl } from 'utils/basePath';

const { Option } = Select;

function GeneralDashboardSettings(): JSX.Element {
	const { dashboardData, setDashboardData } = useDashboardStore();

	const updateDashboardMutation = useUpdateDashboard();

	const [cursorSyncMode, setCursorSyncMode] = useDashboardCursorSyncMode(
		dashboardData?.id,
	);

	const [syncTooltipFilterMode, setSyncTooltipFilterMode] =
		useSyncTooltipFilterMode(dashboardData?.id);

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
		<div className={styles.overviewContent}>
			<Col className={styles.overviewSettings}>
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
						<Typography className={styles.dashboardName}>Dashboard Name</Typography>
						<section className={styles.nameIconInput}>
							<Select
								defaultActiveFirstOption
								data-testid="dashboard-image"
								suffixIcon={null}
								rootClassName={styles.dashboardImageInput}
								value={updatedImage}
								onChange={(value: string): void => setUpdatedImage(value)}
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
								value={updatedTitle}
								onChange={(e): void => setUpdatedTitle(e.target.value)}
							/>
						</section>
					</div>

					<div>
						<Typography className={styles.dashboardName}>Description</Typography>
						<Input.TextArea
							data-testid="dashboard-desc"
							rows={6}
							value={updatedDescription}
							className={styles.descriptionTextArea}
							onChange={(e): void => setUpdatedDescription(e.target.value)}
						/>
					</div>
					<div>
						<Typography className={styles.dashboardName}>Tags</Typography>
						<AddTags tags={updatedTags} setTags={setUpdatedTags} />
					</div>
				</Space>
			</Col>
			<Col className={`${styles.overviewSettings} ${styles.crossPanelSyncGroup}`}>
				<div className={styles.crossPanelSyncSectionHeader}>
					<Typography.Text className={styles.crossPanelSyncSectionTitle}>
						Cross-Panel Sync
					</Typography.Text>
					<Tooltip
						title={
							<div className={styles.crossPanelSyncTooltipContent}>
								<strong className={styles.crossPanelSyncTooltipTitle}>
									Cross-Panel Sync
								</strong>
								<span className={styles.crossPanelSyncTooltipDescription}>
									Sync crosshair and tooltip across all the dashboard panels
								</span>
								<a
									href="https://signoz.io/docs/dashboards/interactivity/#cross-panel-sync"
									target="_blank"
									rel="noopener noreferrer"
									className={styles.crossPanelSyncTooltipDocLink}
								>
									Learn more
									<ExternalLink size={12} />
								</a>
							</div>
						}
						placement="top"
						mouseEnterDelay={0.5}
					>
						<Info size={14} className={styles.crossPanelSyncInfoIcon} />
					</Tooltip>
				</div>
				<div className={styles.crossPanelSyncRow}>
					<div className={styles.crossPanelSyncInfo}>
						<Typography.Text className={styles.crossPanelSyncTitle}>
							Sync Mode
						</Typography.Text>
						<Typography.Text className={styles.crossPanelSyncDescription}>
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
				</div>
				{cursorSyncMode === DashboardCursorSync.Tooltip && (
					<div className={styles.crossPanelSyncRow}>
						<div className={styles.crossPanelSyncInfo}>
							<Typography.Text className={styles.crossPanelSyncTitle}>
								Synced Tooltip Series
							</Typography.Text>
							<Typography.Text className={styles.crossPanelSyncDescription}>
								Show only series that intersect on group-by, or every series with the
								matching ones highlighted
							</Typography.Text>
						</div>
						<Radio.Group
							value={syncTooltipFilterMode}
							onChange={(e): void => {
								logEvent(Events.TOOLTIP_SYNC_MODE_CHANGED, {
									path: getAbsoluteUrl(window.location.pathname),
									mode: e.target.value,
								});
								setSyncTooltipFilterMode(e.target.value as SyncTooltipFilterMode);
							}}
						>
							<Radio.Button value={SyncTooltipFilterMode.All}>All</Radio.Button>
							<Radio.Button value={SyncTooltipFilterMode.Filtered}>
								Filtered
							</Radio.Button>
						</Radio.Group>
					</div>
				)}
			</Col>
			{numberOfUnsavedChanges > 0 && (
				<div className={styles.overviewSettingsFooter}>
					<div className={styles.unsaved}>
						<div className={styles.unsavedDot} />
						<Typography.Text className={styles.unsavedChanges}>
							{numberOfUnsavedChanges} unsaved change
							{numberOfUnsavedChanges > 1 && 's'}
						</Typography.Text>
					</div>
					<div className={styles.footerActionBtns}>
						<Button
							disabled={updateDashboardMutation.isLoading}
							icon={<X size={14} />}
							onClick={discardHandler}
							type="text"
							className={styles.discardBtn}
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
							className={styles.saveBtn}
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
