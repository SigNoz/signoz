import './OtherFilters.styles.scss';

import Button from 'antd/es/button';
import { SignalType } from 'components/QuickFilters/types';
import { useGetAttributeSuggestions } from 'hooks/queryBuilder/useGetAttributeSuggestions';
import { useMemo } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';
import { DataSource } from 'types/common/queryBuilder';

function OtherFilters({
	signal,
	addedFilters,
	setAddedFilters,
}: {
	signal: SignalType | undefined;
	addedFilters: FilterType[];
	setAddedFilters: React.Dispatch<React.SetStateAction<FilterType[]>>;
}): JSX.Element {
	const {
		data: suggestionsData,
		// isFetching: isFetchingSuggestions,
	} = useGetAttributeSuggestions(
		{
			searchText: '',
			dataSource: DataSource.LOGS,
			filters: {} as TagFilter,
		},
		{
			queryKey: ['other-filters'],
			enabled: !!signal,
		},
	);

	const otherFilters = useMemo(
		() =>
			suggestionsData?.payload?.attributes?.filter(
				(attr) => !addedFilters.some((filter) => filter.key === attr.key),
			),
		[suggestionsData, addedFilters],
	);

	const handleAddFilter = (filter: FilterType): void => {
		setAddedFilters((prev) => [
			...prev,
			{
				key: filter.key,
				dataType: filter.dataType,
				isColumn: filter.isColumn,
				isJSON: filter.isJSON,
				type: filter.type,
			},
		]);
	};

	return (
		<div className="qf-filters other-filters">
			<div className="qf-filters-header">OTHER FILTERS</div>
			<div className="qf-other-filters-list">
				{otherFilters?.map((filter) => (
					<div key={filter.key} className="qf-filter-item other-filters-item">
						<div className="qf-filter-content">
							<div className="qf-filter-key">{filter.key}</div>
							<Button
								className="add-filter-btn periscope-btn"
								size="small"
								onClick={(): void => handleAddFilter(filter as FilterType)}
							>
								Add
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default OtherFilters;
