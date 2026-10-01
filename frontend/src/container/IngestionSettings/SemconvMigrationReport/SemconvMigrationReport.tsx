import { useMemo } from 'react';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';
import { SolidAlertCircle } from '@signozhq/icons';
import { useGetSemconvMigrationReport } from 'api/generated/services/fields';
import TanStackTable from 'components/TanStackTableView';
import { useTimezone } from 'providers/Timezone';

import styles from './SemconvMigrationReport.module.scss';
import {
	getSemconvMigrationReportColumns,
	getSemconvMigrationRowKey,
} from './table.config';

const SKELETON_ROW_COUNT = 3;
// The ingestion keys column is narrow, so a long name or a long list of
// services wraps instead of ending in an ellipsis.
const NAME_AND_SERVICES_MAX_LINES = 3;

function SemconvMigrationReport(): JSX.Element {
	const { data, isLoading, isError } = useGetSemconvMigrationReport();
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const columns = useMemo(
		() => getSemconvMigrationReportColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);
	const entries = data?.data.entries ?? [];

	return (
		<section className={styles.report} data-testid="semconv-migration-report">
			<Typography
				variant="label"
				size="large"
				weight="bold"
				color="inherit"
				as="h4"
				textOverflow="wrap"
			>
				Semantic convention migration
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="p"
				textOverflow="wrap"
			>
				Services in this report sent an old OpenTelemetry field during the last 24
				hours without sending its current replacement. Update their SDK or
				instrumentation when practical; SigNoz queries remain backward compatible.
			</Typography>
			{isError && (
				<Callout
					color="danger"
					size="sm"
					icon={<SolidAlertCircle />}
					testId="semconv-migration-report-error"
				>
					Could not load the semantic convention migration report
				</Callout>
			)}
			{!isError && !isLoading && entries.length === 0 && (
				<div className={styles.empty}>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="tertiary"
						as="p"
						textOverflow="wrap"
						testId="semconv-migration-report-empty"
					>
						No old-only services found in the last 24 hours
					</Typography>
				</div>
			)}
			{!isError && (isLoading || entries.length > 0) && (
				<TanStackTable
					data={entries}
					columns={columns}
					isLoading={isLoading}
					skeletonRowCount={SKELETON_ROW_COUNT}
					getRowKey={getSemconvMigrationRowKey}
					plainTextCellLineClamp={NAME_AND_SERVICES_MAX_LINES}
					disableVirtualScroll
					testId="semconv-migration-report-table"
				/>
			)}
		</section>
	);
}

export default SemconvMigrationReport;
