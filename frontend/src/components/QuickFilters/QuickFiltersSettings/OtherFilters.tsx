import { Button, Skeleton } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { SignalType } from 'components/QuickFilters/types';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useGetAttributeSuggestions } from 'hooks/queryBuilder/useGetAttributeSuggestions';
import { useMemo } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';
import { DataSource } from 'types/common/queryBuilder';

function OtherFiltersSkeleton(): JSX.Element {
	return (
		<>
			{Array.from({ length: 5 }).map((_, index) => (
				<Skeleton.Input
					active
					size="small"
					// eslint-disable-next-line react/no-array-index-key
					key={index}
				/>
			))}
		</>
	);
}

function OtherFilters({
	signal,
	inputValue,
	addedFilters,
	setAddedFilters,
}: {
	signal: SignalType | undefined;
	inputValue: string;
	addedFilters: FilterType[];
	setAddedFilters: React.Dispatch<React.SetStateAction<FilterType[]>>;
}): JSX.Element {
	const isLogDataSource = useMemo(
		() => SIGNAL_DATA_SOURCE_MAP[signal as SignalType] === DataSource.LOGS,
		[signal],
	);

	const {
		data: suggestionsData,
		isFetching: isFetchingSuggestions,
	} = useGetAttributeSuggestions(
		{
			searchText: inputValue,
			dataSource: SIGNAL_DATA_SOURCE_MAP[signal as SignalType],
			filters: {} as TagFilter,
		},
		{
			queryKey: [REACT_QUERY_KEY.GET_OTHER_FILTERS, inputValue],
			enabled: !!signal && isLogDataSource,
		},
	);

	const {
		data: aggregateKeysData,
		isFetching: isFetchingAggregateKeys,
	} = useGetAggregateKeys(
		{
			searchText: inputValue,
			dataSource: SIGNAL_DATA_SOURCE_MAP[signal as SignalType],
			aggregateOperator: 'noop',
			aggregateAttribute: '',
			tagType: '',
		},
		{
			queryKey: [REACT_QUERY_KEY.GET_OTHER_FILTERS, inputValue],
			enabled: !!signal && !isLogDataSource,
		},
	);

	const otherFilters = useMemo(() => {
		let filterAttributes;
		if (isLogDataSource) {
			filterAttributes = suggestionsData?.payload?.attributes || [];
		} else {
			filterAttributes = aggregateKeysData?.payload?.attributeKeys || [];
		}
		return filterAttributes?.filter(
			(attr) => !addedFilters.some((filter) => filter.key === attr.key),
		);
	}, [suggestionsData, aggregateKeysData, addedFilters, isLogDataSource]);

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

	const renderFilters = (): React.ReactNode => {
		const isLoading = isFetchingSuggestions || isFetchingAggregateKeys;
		if (isLoading) return <OtherFiltersSkeleton />;
		if (!otherFilters?.length)
			return <div className="no-values-found">No values found</div>;

		return otherFilters.map((filter) => (
			<div key={filter.key} className="qf-filter-item other-filters-item">
				<div className="qf-filter-key">{filter.key}</div>
				<Button
					className="add-filter-btn periscope-btn"
					size="small"
					onClick={(): void => handleAddFilter(filter as FilterType)}
				>
					Add
				</Button>
			</div>
		));
	};

	return (
		<div className="qf-filters other-filters">
			<div className="qf-filters-header">OTHER FILTERS</div>
			<div className="qf-other-filters-list">
				<OverlayScrollbar>
					<>{renderFilters()}</>
				</OverlayScrollbar>
			</div>
		</div>
	);
}

export default OtherFilters;
