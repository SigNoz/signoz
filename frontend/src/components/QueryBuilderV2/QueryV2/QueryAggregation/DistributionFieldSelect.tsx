import { useMemo, useState } from 'react';
import { Combobox } from '@signozhq/ui/combobox';
import { TelemetrytypesFieldDataTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import useDebounce from 'hooks/useDebounce';
import { getDistributionFieldPlaceholder } from 'lib/query/distributionField';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DATA_SOURCE_TO_SIGNAL } from 'types/common/queryBuilder';

import { toDistributionFieldOptions } from './distributionFieldOptions';

import Styles from './DistributionFieldSelect.module.scss';

/** A logs or traces heatmap or distribution's aggregation: the one numeric field it buckets. */
export default function DistributionFieldSelect({
	queryData,
	onChange,
}: {
	queryData: IBuilderQuery;
	onChange?: (field: string) => void;
}): JSX.Element {
	const [search, setSearch] = useState('');
	const searchText = useDebounce(search, DEBOUNCE_DELAY);

	// The keys API caps its answer, so a field past the cap is reached by searching.
	const {
		data: fieldKeys,
		isLoading,
		isFetching,
	} = useFieldKeysSuggestion(
		{
			signal: DATA_SOURCE_TO_SIGNAL[queryData.dataSource],
			searchText,
			fieldDataType: TelemetrytypesFieldDataTypeDTO.number,
		},
		queryData.builderQueryType,
		{ keepPreviousData: true },
	);

	const [aggregation] = queryData.aggregations ?? [];
	const selectedField =
		aggregation && 'expression' in aggregation ? aggregation.expression : '';

	const items = useMemo(
		() => toDistributionFieldOptions(fieldKeys ?? [], selectedField),
		[fieldKeys, selectedField],
	);

	return (
		<div className={Styles.select}>
			<Combobox
				items={items}
				value={selectedField || undefined}
				onChange={(field): void => onChange?.(field ?? '')}
				allowClear
				placeholder={getDistributionFieldPlaceholder(queryData.dataSource)}
				searchInputProps={{
					placeholder: 'Search numeric fields',
					loading: isFetching,
					onChange: setSearch,
				}}
				loading={isLoading}
				noContent="No numeric fields"
				testId="distribution-field-select"
			/>
		</div>
	);
}
