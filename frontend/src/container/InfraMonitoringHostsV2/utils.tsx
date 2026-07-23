import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { TriangleAlert } from '@signozhq/icons';
import { CellValueTooltip } from 'container/InfraMonitoringK8sV2/components';
import { INFRA_MONITORING_ATTR_KEYS } from 'container/InfraMonitoringK8sV2/constants';
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
		return <CellValueTooltip value={hostName} />;
	}
	return (
		<>
			<Typography.Text color="muted">-</Typography.Text>
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
		</>
	);
}

export function getHostsQuickFiltersConfig(): IQuickFiltersConfig[] {
	return [
		{
			type: FiltersType.CHECKBOX,
			title: 'Host Name',
			attributeKey: {
				key: INFRA_MONITORING_ATTR_KEYS.HOST_NAME,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: INFRA_MONITORING_ATTR_KEYS.SYSTEM_CPU_LOAD_AVERAGE_15M,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'OS Type',
			attributeKey: {
				key: INFRA_MONITORING_ATTR_KEYS.OS_TYPE,
				dataType: DataTypes.String,
				type: 'resource',
			},
			aggregateOperator: 'noop',
			aggregateAttribute: INFRA_MONITORING_ATTR_KEYS.SYSTEM_CPU_LOAD_AVERAGE_15M,
			dataSource: DataSource.METRICS,
			defaultOpen: true,
		},
		{
			type: FiltersType.CHECKBOX,
			title: 'Environment',
			attributeKey: {
				key: INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT,
				dataType: DataTypes.String,
				type: 'resource',
			},
			defaultOpen: true,
		},
	];
}
