import { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Switch } from '@signozhq/ui/switch';
import { CalendarClock, Check, Clock4 } from '@signozhq/icons';
import { get } from 'lodash-es';
import { Base64Icons } from 'container/DashboardContainer/DashboardSettings/General/utils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';

import { lastUpdatedLabel, type DashboardListItem } from '../../utils';
import {
	DynamicColumns,
	useDashboardsListVisibleColumnsStore,
	type DashboardDynamicColumns,
} from './useDynamicColumns';

import styles from './ConfigureMetadataModal.module.scss';

interface Props {
	open: boolean;
	previewDashboard: DashboardListItem | undefined;
	onClose: () => void;
}

function ConfigureMetadataModal({
	open,
	previewDashboard,
	onClose,
}: Props): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const storedColumns = useDashboardsListVisibleColumnsStore(
		(s) => s.visibleColumns,
	);
	const setStoredColumns = useDashboardsListVisibleColumnsStore(
		(s) => s.setVisibleColumns,
	);
	const [draftColumns, setDraftColumns] =
		useState<DashboardDynamicColumns>(storedColumns);

	useEffect(() => {
		if (open) {
			setDraftColumns(storedColumns);
		}
	}, [open, storedColumns]);

	const handleSave = (): void => {
		setStoredColumns(draftColumns);
		onClose();
	};

	const previewImage = previewDashboard?.image || Base64Icons[0];
	const previewName = previewDashboard?.spec?.display?.name;
	const previewCreatedBy = previewDashboard?.createdBy;
	const previewUpdatedBy = previewDashboard?.updatedBy;
	const previewUpdatedAt = previewDashboard?.updatedAt;

	const formattedCreatedAt = previewDashboard
		? formatTimezoneAdjustedTimestamp(
				get(previewDashboard, 'createdAt', '') as string,
				DATE_TIME_FORMATS.DASH_DATETIME_UTC,
			)
		: '';

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title="Configure Metadata"
			footer={
				<Button
					type="text"
					icon={<Check size={14} />}
					className={styles.saveChanges}
					onClick={handleSave}
				>
					Save Changes
				</Button>
			}
			rootClassName="configureMetadataModalRoot"
		>
			<div className={styles.content}>
				<div className={styles.preview}>
					<section className={styles.previewHeader}>
						<img
							src={previewImage}
							alt="dashboard-image"
							className={styles.previewIcon}
						/>
						<Typography.Text className={styles.previewTitle}>
							{previewName}
						</Typography.Text>
					</section>
					<section className={styles.previewDetails}>
						<section className={styles.previewRow}>
							{draftColumns.createdAt && (
								<span className={styles.formattedTime}>
									<CalendarClock size={14} />
									<Typography.Text className={styles.formattedTimeText}>
										{formattedCreatedAt}
									</Typography.Text>
								</span>
							)}
							{draftColumns.createdBy && (
								<div className={styles.user}>
									<Typography.Text className={styles.userTag}>
										{previewCreatedBy?.substring(0, 1).toUpperCase()}
									</Typography.Text>
									<Typography.Text className={styles.userLabel}>
										{previewCreatedBy}
									</Typography.Text>
								</div>
							)}
						</section>
						<section className={styles.previewRow}>
							{draftColumns.updatedAt && (
								<span className={styles.formattedTime}>
									<CalendarClock size={14} />
									<Typography.Text className={styles.formattedTimeText}>
										{lastUpdatedLabel(previewUpdatedAt)}
									</Typography.Text>
								</span>
							)}
							{draftColumns.updatedBy && (
								<div className={styles.user}>
									<Typography.Text className={styles.userTag}>
										{previewUpdatedBy?.substring(0, 1).toUpperCase()}
									</Typography.Text>
									<Typography.Text className={styles.userLabel}>
										{previewUpdatedBy}
									</Typography.Text>
								</div>
							)}
						</section>
					</section>
				</div>

				<div className={styles.action}>
					<div className={styles.actionLeft}>
						<CalendarClock size={14} />
						<Typography.Text>Created at</Typography.Text>
					</div>
					<div className={styles.connectionLine} />
					<div className={styles.actionRight}>
						<Switch
							value
							disabled
							onChange={(check): void =>
								setDraftColumns((prev) => ({
									...prev,
									[DynamicColumns.CREATED_AT]: check,
								}))
							}
						/>
					</div>
				</div>
				<div className={styles.action}>
					<div className={styles.actionLeft}>
						<CalendarClock size={14} />
						<Typography.Text>Created by</Typography.Text>
					</div>
					<div className={styles.connectionLine} />
					<div className={styles.actionRight}>
						<Switch
							value
							disabled
							onChange={(check): void =>
								setDraftColumns((prev) => ({
									...prev,
									[DynamicColumns.CREATED_BY]: check,
								}))
							}
						/>
					</div>
				</div>
				<div className={styles.action}>
					<div className={styles.actionLeft}>
						<Clock4 size={14} />
						<Typography.Text>Updated at</Typography.Text>
					</div>
					<div className={styles.connectionLine} />
					<div className={styles.actionRight}>
						<Switch
							value={draftColumns.updatedAt}
							onChange={(check): void =>
								setDraftColumns((prev) => ({
									...prev,
									[DynamicColumns.UPDATED_AT]: check,
								}))
							}
						/>
					</div>
				</div>
				<div className={styles.action}>
					<div className={styles.actionLeft}>
						<Clock4 size={14} />
						<Typography.Text>Updated by</Typography.Text>
					</div>
					<div className={styles.connectionLine} />
					<div className={styles.actionRight}>
						<Switch
							value={draftColumns.updatedBy}
							onChange={(check): void =>
								setDraftColumns((prev) => ({
									...prev,
									[DynamicColumns.UPDATED_BY]: check,
								}))
							}
						/>
					</div>
				</div>
			</div>
		</Modal>
	);
}

export default ConfigureMetadataModal;
