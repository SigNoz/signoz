import { useMemo } from 'react';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';

import {
	InfraMonitoringEntity,
	METRIC_NAMESPACE_BY_ENTITY,
} from '../constants';

export interface GroupByOption {
	value: string;
	label: string;
}

export interface UseInfraMonitoringGroupByDataReturn {
	groupByOptions: GroupByOption[];
	isLoading: boolean;
}

export function useInfraMonitoringGroupByData(
	entity: InfraMonitoringEntity,
): UseInfraMonitoringGroupByDataReturn {
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);
	const { minTime, maxTime } = getMinMaxTime();
	const startUnixMilli = Math.floor(minTime / NANO_SECOND_MULTIPLIER);
	const endUnixMilli = Math.floor(maxTime / NANO_SECOND_MULTIPLIER);

	const { data: groupByFiltersData, isLoading } = useGetFieldsKeys(
		{
			signal: TelemetrytypesSignalDTO.metrics,
			metricNamespace: METRIC_NAMESPACE_BY_ENTITY[entity],
			limit: 100,
			startUnixMilli,
			endUnixMilli,
			fieldContext: TelemetrytypesFieldContextDTO.resource,
		},
		{
			query: {
				queryKey: ['getFieldsKeys', entity, startUnixMilli, endUnixMilli],
			},
		},
	);

	const groupByOptions = useMemo(() => {
		const keys = groupByFiltersData?.data?.keys;
		if (!keys) {
			return [];
		}

		const allKeys = Object.values(keys).flat();
		const seen = new Set<string>();

		return allKeys
			.filter((field) => {
				if (seen.has(field.name)) {
					return false;
				}
				seen.add(field.name);
				return true;
			})
			.map((field) => ({
				value: field.name,
				label: field.name,
			}));
	}, [groupByFiltersData]);

	return { groupByOptions, isLoading };
}
