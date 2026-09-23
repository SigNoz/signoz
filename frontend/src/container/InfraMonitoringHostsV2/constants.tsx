import React from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Progress } from '@signozhq/ui/progress';
import {
	InframonitoringtypesHostRecordDTO,
	InframonitoringtypesHostStatusDTO,
} from 'api/generated/services/sigNoz.schemas';
import { K8sDetailsMetadataConfig } from 'container/InfraMonitoringK8sV2/Base/K8sBaseDetails';
import { INFRA_MONITORING_ATTR_KEYS } from 'container/InfraMonitoringK8sV2/constants';
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';
import { TextNoData } from 'container/InfraMonitoringK8sV2/components';
import { getStrokeColorForPercent } from 'container/InfraMonitoringK8sV2/components/EntityProgressBar.utils';
import { SelectedItemParams } from 'container/InfraMonitoringK8sV2/hooks';
import {
	getHostQueryPayload,
	hostWidgetInfo,
} from 'container/LogDetailedView/InfraMetrics/constants';

import infraHostsStyles from './InfraMonitoringHosts.module.scss';

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
				<TextNoData type="typography" />
			),
	},
	{
		label: 'CPU USAGE',
		getValue: (h): number => h.cpu * 100,
		render: (value): React.ReactNode => (
			<Progress
				percent={Number(Number(value).toFixed(1))}
				strokeColor={getStrokeColorForPercent('cpu', Number(value))}
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
				strokeColor={getStrokeColorForPercent('memory', Number(value))}
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
	return getHostQueryPayload(host.hostName, start, end);
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
