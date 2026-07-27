import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Badge } from '@signozhq/ui/badge';
import { Progress } from '@signozhq/ui/progress';
import { Typography } from '@signozhq/ui/typography';
import {
	InframonitoringtypesHostRecordDTO,
	InframonitoringtypesHostStatusDTO,
} from 'api/generated/services/sigNoz.schemas';
import { K8sDetailsMetadataConfig } from 'container/InfraMonitoringK8sV2/Base/K8sBaseDetails';
import { INFRA_MONITORING_ATTR_KEYS } from 'container/InfraMonitoringK8sV2/constants';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';
import { SelectedItemParams } from 'container/InfraMonitoringK8sV2/hooks';
import {
	getHostQueryPayload,
	hostWidgetInfo,
} from 'container/LogDetailedView/InfraMetrics/constants';

import infraHostsStyles from './InfraMonitoringHosts.module.scss';

export function getProgressColor(percent: number): string {
	if (percent >= 90) {
		return Color.BG_SAKURA_500;
	}
	if (percent >= 60) {
		return Color.BG_AMBER_500;
	}
	return Color.BG_FOREST_500;
}

export function getMemoryProgressColor(percent: number): string {
	if (percent >= 90) {
		return Color.BG_CHERRY_500;
	}
	if (percent >= 60) {
		return Color.BG_AMBER_500;
	}
	return Color.BG_FOREST_500;
}

export type HostDetailMetadataConfigType =
	K8sDetailsMetadataConfig<InframonitoringtypesHostRecordDTO>;
export const hostDetailsMetadataConfig: HostDetailMetadataConfigType[] = [
	{
		label: 'STATUS',
		getValue: (h): string =>
			h.status === InframonitoringtypesHostStatusDTO.active
				? 'ACTIVE'
				: 'INACTIVE',
		render: (value, h): React.ReactNode => {
			const isActive = h.status === InframonitoringtypesHostStatusDTO.active;
			return (
				<Badge
					variant="outline"
					className={`${infraHostsStyles.infraMonitoringTags} ${
						isActive ? infraHostsStyles.tagsActive : infraHostsStyles.tagsInactive
					}`}
				>
					{value}
				</Badge>
			);
		},
	},
	{
		label: 'OPERATING SYSTEM',
		getValue: (h): string => h.meta?.[INFRA_MONITORING_ATTR_KEYS.OS_TYPE] || '-',
		render: (value): React.ReactNode =>
			value !== '-' ? (
				<Badge variant="outline" className={infraHostsStyles.infraMonitoringTags}>
					{value}
				</Badge>
			) : (
				<Typography.Text>-</Typography.Text>
			),
	},
	{
		label: 'CPU USAGE',
		getValue: (h): number => h.cpu * 100,
		render: (value): React.ReactNode => (
			<Progress
				percent={Number(Number(value).toFixed(1))}
				strokeColor={getProgressColor(Number(value))}
				showInfo
			/>
		),
	},
	{
		label: 'MEMORY USAGE',
		getValue: (h): number => h.memory * 100,
		render: (value): React.ReactNode => (
			<Progress
				percent={Number(Number(value).toFixed(1))}
				strokeColor={getMemoryProgressColor(Number(value))}
				showInfo
			/>
		),
	},
];

export function getHostMetricsQueryPayload(
	host: InframonitoringtypesHostRecordDTO,
	start: number,
	end: number,
): ReturnType<typeof getHostQueryPayload> {
	return getHostQueryPayload(host.hostName, start, end, true);
}

export { hostWidgetInfo };

export const hostGetSelectedItemExpression = (
	params: SelectedItemParams,
): string =>
	`${INFRA_MONITORING_ATTR_KEYS.HOST_NAME} = ${formatValueForExpression(params.selectedItem ?? '')}`;

export function hostInitialLogTracesExpression(
	host: InframonitoringtypesHostRecordDTO,
): string {
	const hostName = formatValueForExpression(host.hostName || '');
	return `${INFRA_MONITORING_ATTR_KEYS.HOST_NAME} = ${hostName}`;
}

export function hostInitialEventsExpression(
	_host: InframonitoringtypesHostRecordDTO,
): string {
	return '';
}

export const hostGetEntityName = (
	host: InframonitoringtypesHostRecordDTO,
): string => host.hostName;
