import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Col, Input, Radio, Select, Space, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import AddTags from 'container/DashboardContainer/DashboardSettings/General/AddTags';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { isEqual } from 'lodash-es';
import { Check, ExternalLink, SolidInfoCircle, X } from '@signozhq/icons';
import { patchDashboardV2 } from 'api/generated/services/dashboard';
import type {
	DashboardtypesJSONPatchOperationDTO,
	TagtypesPostableTagDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useNotifications } from 'hooks/useNotifications';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import styles from './GeneralSettings.module.scss';
import { Button } from './styles';
import { Base64Icons } from './utils';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';
import { getAbsoluteUrl } from 'utils/basePath';

import type { V2Dashboard } from '../../utils';

const { Option } = Select;

interface Props {
	dashboard: V2Dashboard | undefined;
	onRefetch: () => void;
}

// Convert V2 tags ({key, value}[]) into "key:value" strings for the V1
// AddTags component (which expects string[]), and back on save.
//
// V2 tags require both `key` and `value` to be non-empty server-side
// (returns `tag_invalid_value` otherwise). To preserve the V1 single-word
// tag UX, a string with no ':' is round-tripped as `{key: x, value: x}` and
// collapsed back to just `x` for display.
function tagsToStrings(tags: TagtypesPostableTagDTO[]): string[] {
	return tags.map((t) => (t.key === t.value ? t.key : `${t.key}:${t.value}`));
}

function stringsToTags(tagStrings: string[]): TagtypesPostableTagDTO[] {
	return tagStrings
		.map((s) => {
			const trimmed = s.trim();
			const idx = trimmed.indexOf(':');
			if (idx === -1) return { key: trimmed, value: trimmed };
			const key = trimmed.slice(0, idx).trim();
			const value = trimmed.slice(idx + 1).trim();
			return { key, value: value || key };
		})
		.filter((t) => t.key.length > 0);
}

function GeneralDashboardSettingsV2({
	dashboard,
	onRefetch,
}: Props): JSX.Element {
	const id = dashboard?.id ?? '';

	const [cursorSyncMode, setCursorSyncMode] = useDashboardCursorSyncMode(id);
	const [syncTooltipFilterMode, setSyncTooltipFilterMode] =
		useSyncTooltipFilterMode(id);

	const title = dashboard?.data?.spec?.display?.name ?? '';
	const description = dashboard?.data?.spec?.display?.description ?? '';
	const image = dashboard?.data?.metadata?.image || Base64Icons[0];
	const tagsAsStrings = useMemo(
		() => tagsToStrings(dashboard?.data?.metadata?.tags ?? []),
		[dashboard?.data?.metadata?.tags],
	);

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [updatedTags, setUpdatedTags] = useState<string[]>(tagsAsStrings);
	const [updatedDescription, setUpdatedDescription] = useState<string>(
		description,
	);
	const [updatedImage, setUpdatedImage] = useState<string>(image);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [numberOfUnsavedChanges, setNumberOfUnsavedChanges] = useState<number>(
		0,
	);

	const { t } = useTranslation('common');
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();

	// Sync state when dashboard refetches after a save
	useEffect(() => {
		setUpdatedTitle(title);
		setUpdatedDescription(description);
		setUpdatedImage(image);
		setUpdatedTags(tagsAsStrings);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboard?.updatedAt]);

	const buildPatch = (): DashboardtypesJSONPatchOperationDTO[] => {
		const ops: DashboardtypesJSONPatchOperationDTO[] = [];
		const replace = (
			path: string,
			value: unknown,
		): DashboardtypesJSONPatchOperationDTO => ({
			op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
			path,
			value,
		});

		if (updatedTitle !== title) {
			ops.push(replace('/spec/display/name', updatedTitle));
		}
		if (updatedDescription !== description) {
			ops.push(replace('/spec/display/description', updatedDescription));
		}
		if (updatedImage !== image) {
			ops.push(replace('/metadata/image', updatedImage));
		}
		if (!isEqual(updatedTags, tagsAsStrings)) {
			ops.push(replace('/metadata/tags', stringsToTags(updatedTags)));
		}
		return ops;
	};

	const onSaveHandler = async (): Promise<void> => {
		if (!id) return;
		const ops = buildPatch();
		if (ops.length === 0) return;

		try {
			setIsSaving(true);
			await patchDashboardV2({ id }, ops);
			notifications.success({ message: 'Dashboard updated' });
			onRefetch();
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsSaving(false);
		}
	};

	useEffect(() => {
		let n = 0;
		const initialValues = [title, description, tagsAsStrings, image];
		const updatedValues = [
			updatedTitle,
			updatedDescription,
			updatedTags,
			updatedImage,
		];
		initialValues.forEach((val, index) => {
			if (!isEqual(val, updatedValues[index])) n += 1;
		});
		setNumberOfUnsavedChanges(n);
	}, [
		description,
		image,
		tagsAsStrings,
		title,
		updatedDescription,
		updatedImage,
		updatedTags,
		updatedTitle,
	]);

	const discardHandler = (): void => {
		setUpdatedTitle(title);
		setUpdatedImage(image);
		setUpdatedTags(tagsAsStrings);
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
						<SolidInfoCircle size="md" className={styles.crossPanelSyncInfoIcon} />
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
							disabled={isSaving}
							icon={<X size={14} />}
							onClick={discardHandler}
							type="text"
							className={styles.discardBtn}
						>
							Discard
						</Button>
						<Button
							style={{ margin: '16px 0' }}
							disabled={isSaving}
							loading={isSaving}
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

export default GeneralDashboardSettingsV2;
