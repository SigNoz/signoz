import { Select } from 'antd';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { REDUCE_TO_VALUES } from 'constants/queryBuilder';
import { memo, useEffect, useRef, useState } from 'react';
import { MetricAggregation } from 'types/api/v5/queryRange';
// ** Types
import { ReduceOperators } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

import { ReduceToFilterProps } from './ReduceToFilter.interfaces';

export const ReduceToFilter = memo(function ReduceToFilter({
	query,
	onChange,
}: ReduceToFilterProps): JSX.Element {
	const isMounted = useRef<boolean>(false);
	const [currentValue, setCurrentValue] = useState<
		SelectOption<ReduceOperators, string>
	>(REDUCE_TO_VALUES[2]); // default to avg

	const handleChange = (
		newValue: SelectOption<ReduceOperators, string>,
	): void => {
		setCurrentValue(newValue);
		onChange(newValue.value);
	};

	useEffect(
		() => {
			if (!isMounted.current) {
				const reduceToValue =
					(query.aggregations?.[0] as MetricAggregation)?.reduceTo || query.reduceTo;

				setCurrentValue(
					REDUCE_TO_VALUES.find((option) => option.value === reduceToValue) ||
						REDUCE_TO_VALUES[2],
				);
				isMounted.current = true;
				return;
			}

			const aggregationAttributeType = query.aggregateAttribute?.type as
				| MetricType
				| undefined;

			if (aggregationAttributeType === MetricType.SUM) {
				handleChange(REDUCE_TO_VALUES[1]);
			} else {
				handleChange(REDUCE_TO_VALUES[2]);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[query.aggregateAttribute?.key],
	);

	return (
		<Select
			placeholder="Reduce to"
			style={{ width: '100%' }}
			options={REDUCE_TO_VALUES}
			value={currentValue}
			data-testid="reduce-to"
			labelInValue
			onChange={handleChange}
		/>
	);
});
