import { useQuery } from 'react-query';
import { Alert, Table, TableColumnsType } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import getSemconvMigrationReport from 'api/semconv/getMigrationReport';
import dayjs from 'dayjs';
import { SemconvMigrationReportEntry } from 'types/api/semconvMigration';

function SemconvMigrationReport(): JSX.Element {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['semconv-migration-report'],
		queryFn: getSemconvMigrationReport,
	});

	const columns: TableColumnsType<SemconvMigrationReportEntry> = [
		{
			title: 'Old name',
			dataIndex: 'old',
			key: 'old',
		},
		{
			title: 'Current name',
			dataIndex: 'current',
			key: 'current',
		},
		{
			title: 'Signal',
			dataIndex: 'signal',
			key: 'signal',
		},
		{
			title: 'Services still sending only the old name',
			dataIndex: 'services',
			key: 'services',
			render: (services: string[]): string => services.join(', '),
		},
		{
			title: 'Last seen',
			dataIndex: 'lastSeenUnixMilli',
			key: 'lastSeenUnixMilli',
			render: (value: number): string =>
				dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
		},
	];

	return (
		<section className="semconv-migration-report">
			<Typography.Title level={4}>Semantic convention migration</Typography.Title>
			<Typography.Text>
				Services in this report sent an old OpenTelemetry field during the last 24
				hours without sending its current replacement. Update their SDK or
				instrumentation when practical; SigNoz queries remain backward compatible.
			</Typography.Text>
			{isError && (
				<Alert
					type="error"
					showIcon
					message="Could not load the semantic convention migration report"
				/>
			)}
			<Table
				loading={isLoading}
				columns={columns}
				dataSource={data?.entries ?? []}
				rowKey={(entry): string => `${entry.current}-${entry.old}-${entry.signal}`}
				pagination={false}
				locale={{ emptyText: 'No old-only services found in the last 24 hours' }}
			/>
		</section>
	);
}

export default SemconvMigrationReport;
