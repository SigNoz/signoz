import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';
import { useCreateExportDashboard } from 'hooks/dashboard/useCreateExportDashboard';
import {
	ExportDashboard,
	useExportDashboards,
} from 'hooks/dashboard/useExportDashboards';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import ExportDashboardSelect from './ExportDashboardSelect';
import styles from './ExportPanel.module.scss';

export interface ExportPanelProps {
	isLoading?: boolean;
	onExport: (
		dashboard: ExportDashboard | null,
		isNewDashboard?: boolean,
	) => void;
	query: Query | null;
	/** Controlled open state of the dialog. */
	open: boolean;
	/** Called when the dialog requests to close (Cancel / overlay / Esc). */
	onClose: () => void;
}

/**
 * "Add to dashboard" dialog: export the panel into an existing dashboard or a newly
 * created one. Navigation is the caller's job via `onExport` (flag-aware V1/V2 editor).
 */
function ExportPanelContainer({
	isLoading,
	onExport,
	open,
	onClose,
}: ExportPanelProps): JSX.Element {
	const { t } = useTranslation(['dashboard']);

	// Track the object, not just the id, so export survives a search that narrows it out.
	const [selectedDashboard, setSelectedDashboard] =
		useState<ExportDashboard | null>(null);
	const [searchText, setSearchText] = useState('');

	const {
		dashboards,
		isLoading: isAllDashboardsLoading,
		isFetching: isDashboardsFetching,
	} = useExportDashboards(searchText);

	const { create: createNewDashboard, isLoading: createDashboardLoading } =
		useCreateExportDashboard({
			title: t('new_dashboard_title', { ns: 'dashboard' }),
			onCreated: (dashboard) => onExport(dashboard, true),
		});

	// Reset on close so each open starts fresh (the dialog stays mounted).
	useEffect(() => {
		if (!open) {
			setSelectedDashboard(null);
			setSearchText('');
		}
	}, [open]);

	const handleSelect = useCallback(
		(dashboardId: string): void => {
			setSelectedDashboard(
				dashboards.find(({ id }) => id === dashboardId) ?? null,
			);
		},
		[dashboards],
	);

	const handleExportClick = useCallback((): void => {
		onExport(selectedDashboard, false);
	}, [selectedDashboard, onExport]);

	const isExportDisabled =
		isAllDashboardsLoading || !selectedDashboard || isLoading;

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title="Add to dashboard"
			testId="export-panel-dialog"
			footer={
				<div className={styles.footer}>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						onClick={onClose}
						testId="export-panel-cancel"
					>
						Cancel
					</Button>
					<Button
						color="primary"
						size="md"
						loading={isLoading}
						disabled={isExportDisabled}
						onClick={handleExportClick}
						testId="export-panel-export"
					>
						Add to dashboard
					</Button>
				</div>
			}
		>
			<div className={styles.body}>
				<div className={styles.field}>
					<Typography.Text className={styles.label}>
						Select a dashboard
					</Typography.Text>
					<ExportDashboardSelect
						dashboards={dashboards}
						value={selectedDashboard?.id ?? null}
						selectedDashboard={selectedDashboard}
						loading={isDashboardsFetching}
						disabled={isAllDashboardsLoading || createDashboardLoading}
						onChange={handleSelect}
						onSearch={setSearchText}
					/>
				</div>

				<div className={styles.newDashboard}>
					<Typography.Text className={styles.hint}>
						Or create a new dashboard with this panel
					</Typography.Text>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						prefix={<Plus size={14} />}
						loading={createDashboardLoading}
						disabled={createDashboardLoading}
						onClick={createNewDashboard}
						testId="export-panel-new-dashboard"
					>
						New dashboard
					</Button>
				</div>
			</div>
		</DialogWrapper>
	);
}

ExportPanelContainer.defaultProps = {
	isLoading: false,
};

export default ExportPanelContainer;
