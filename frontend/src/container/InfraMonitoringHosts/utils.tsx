import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Tooltip, Typography } from 'antd';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { TriangleAlert } from 'lucide-react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

const HOSTNAME_DOCS_URL =
	'https://signoz.io/docs/infrastructure-monitoring/hostmetrics/#host-name-is-blankempty';

export function HostnameCell({
	hostName,
}: {
	hostName?: string | null;
}): React.ReactElement {
	const isEmpty = !hostName || !hostName.trim();
	if (!isEmpty) {
		return <div className="hostname-column-value">{hostName}</div>;
	}
	return (
		<div className="hostname-cell-missing">
			<Typography.Text type="secondary" className="hostname-cell-placeholder">
				-
			</Typography.Text>
			<Tooltip
				title={
					<div>
						Missing host.name metadata.
						<br />
						<a
							href={HOSTNAME_DOCS_URL}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e): void => e.stopPropagation()}
						>
							Learn how to configure →
						</a>
					</div>
				}
				trigger={['hover', 'focus']}
			>
				<span
					className="hostname-cell-warning-icon"
					tabIndex={0}
					role="img"
					aria-label="Missing host.name metadata"
					onClick={(e): void => e.stopPropagation()}
					onKeyDown={(e): void => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.stopPropagation();
						}
					}}
				>
					<TriangleAlert size={14} color={Color.BG_CHERRY_500} />
				</span>
			</Tooltip>
		</div>
	);
}

export const getHostListsQuery = (): HostListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	groupBy: [],
	orderBy: { columnName: 'cpu', order: 'desc' },
});

export const HostsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Host Name',
		attributeKey: {
			key: 'host_name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'system_cpu_load_average_15m',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'OS Type',
		attributeKey: {
			key: 'os_type',
			dataType: DataTypes.String,
			type: 'resource',
		},
		aggregateOperator: 'noop',
		aggregateAttribute: 'system_cpu_load_average_15m',
		dataSource: DataSource.METRICS,
		defaultOpen: true,
	},
];

export function getHostsQuickFiltersConfig(
	dotMetricsEnabled: boolean,
): IQuickFiltersConfig[] {
	const hostNameKey = dotMetricsEnabled ? 'host.name' : 'host_name';
	const osTypeKey = dotMetricsEnabled ? 'os.type' : 'os_type';
	const metricName = dotMetricsEnabled
		? 'system.cpu.load_average.15m'
		: 'system_cpu_load_average_15m';

	const environmentKey = dotMetricsEnabled
		? 'deployment.environment'
		: 'deployment_environment';

	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Host Name',
			attributeKey: {
				key: hostNameKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'OS Type',
			attributeKey: {
				key: osTypeKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: metricName,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: environmentKey,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}
