import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	getEndPointDropDownQueryPayload,
	getFormattedEndPointDropDownData,
} from 'container/ApiMonitoring/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';

import styles from './EndPointPicker.module.scss';

const VIRTUALIZE_AFTER = 100;
const ALL_ENDPOINTS = '__all_endpoints__';

interface EndPointPickerProps {
	domainName: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	filterExpression: string;
	value: string;
	onChange: (endPointName: string) => void;
}

function EndPointPicker({
	domainName,
	timeRange,
	filterExpression,
	value,
	onChange,
}: EndPointPickerProps): JSX.Element {
	const payload = useMemo(
		() =>
			getEndPointDropDownQueryPayload(
				domainName,
				timeRange.startTime,
				timeRange.endTime,
				filterExpression,
			),
		[domainName, timeRange.startTime, timeRange.endTime, filterExpression],
	);

	const { data, isLoading, isFetching } = useQuery({
		queryKey: [
			REACT_QUERY_KEY.GET_ENDPOINT_DROPDOWN_DATA,
			payload,
			ENTITY_VERSION_V5,
		],
		queryFn: () => GetMetricQueryRange(payload, ENTITY_VERSION_V5),
		staleTime: 60 * 1000,
	});

	const items = useMemo(
		(): ComboboxSimpleItem[] => [
			{ value: ALL_ENDPOINTS, label: 'All endpoints' },
			...getFormattedEndPointDropDownData(
				data?.payload?.data?.result?.[0]?.table?.rows ?? [],
			).map(({ value: url }) => ({
				value: url,
				label: (
					<span className={styles.option} title={url}>
						{url}
					</span>
				),
			})),
		],
		[data],
	);

	return (
		<div className={styles.picker}>
			<ComboboxSimple
				items={items}
				value={value || ALL_ENDPOINTS}
				onChange={(next): void =>
					onChange(!next || next === ALL_ENDPOINTS ? '' : (next as string))
				}
				inputPlaceholder="Search endpoints"
				emptyPlaceholder="No endpoints found"
				loading={isLoading || isFetching}
				virtualized={items.length > VIRTUALIZE_AFTER}
				withPortal={false}
				testId="endpoint-picker"
			/>
		</div>
	);
}

export default EndPointPicker;
