import { useMemo, useState } from 'react';
import { Select, Spin } from 'antd';
import { TelemetrytypesFieldDataTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import useDebounce from 'hooks/useDebounce';
import { getHeatmapFieldPlaceholder } from 'lib/query/heatmapField';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DATA_SOURCE_TO_SIGNAL } from 'types/common/queryBuilder';
import { useSelectPopupContainer } from 'utils/selectPopupContainer';

import { toHeatmapFieldOptions } from './heatmapFieldOptions';

import Styles from './HeatmapFieldSelect.module.scss';

/** A logs or traces heatmap's aggregation: the one numeric field it buckets. */
export default function HeatmapFieldSelect({
	queryData,
	onChange,
}: {
	queryData: IBuilderQuery;
	onChange?: (field: string) => void;
}): JSX.Element {
	const getPopupContainer = useSelectPopupContainer();
	const [search, setSearch] = useState('');
	const searchText = useDebounce(search, 300);

	// The keys API caps its answer, so a field past the cap is reached by searching.
	const { data: fieldKeys, isLoading } = useFieldKeysSuggestion(
		{
			signal: DATA_SOURCE_TO_SIGNAL[queryData.dataSource],
			searchText,
			fieldDataType: TelemetrytypesFieldDataTypeDTO.number,
		},
		queryData.builderQueryType,
		{ keepPreviousData: true },
	);

	const selectedField =
		(queryData.aggregations?.[0] as { expression?: string } | undefined)
			?.expression ?? '';

	const options = useMemo(
		() => toHeatmapFieldOptions(fieldKeys ?? [], selectedField),
		[fieldKeys, selectedField],
	);

	return (
		<Select
			className={Styles.select}
			popupClassName={Styles.popup}
			getPopupContainer={getPopupContainer}
			mode="multiple"
			allowClear
			value={selectedField ? [selectedField] : []}
			options={options}
			searchValue={search}
			onSearch={setSearch}
			onChange={(values: string[]): void => {
				setSearch('');
				onChange?.(values.at(-1) ?? '');
			}}
			placeholder={getHeatmapFieldPlaceholder(queryData.dataSource)}
			loading={isLoading}
			notFoundContent={isLoading ? <Spin size="small" /> : 'No numeric fields'}
			data-testid="heatmap-field-select"
		/>
	);
}
