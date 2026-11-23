import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dialog } from '@signozhq/ui/dialog';
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

	const isExportDisabled = isAllDashboardsLoading || !selectedDashboard;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Add to dashboard"
			testId="export-panel-dialog"
			footerSuffix={
				<>
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
						disabledTooltip={
							isAllDashboardsLoading
								? 'Wait for the dashboards to load'
								: 'Select a dashboard first'
						}
						variant="solid"
						color="primary"
						size="md"
						loading={isLoading}
						disabled={isExportDisabled}
						onClick={handleExportClick}
						testId="export-panel-export"
					>
						Add to dashboard
					</Button>
				</>
			}
		>
			<div className={styles.body}>
				<div className={styles.field}>
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						Select a dashboard
					</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						Or create a new dashboard with this panel
					</Typography>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						prefix={<Plus size={14} />}
						loading={createDashboardLoading}
						onClick={createNewDashboard}
						testId="export-panel-new-dashboard"
					>
						New dashboard
					</Button>
				</div>
			</div>
		</Dialog>
	);
}

ExportPanelContainer.defaultProps = {
	isLoading: false,
};

export default ExportPanelContainer;
