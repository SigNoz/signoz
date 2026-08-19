import { useMemo } from 'react';
import { Button, Skeleton } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { SignalType } from 'components/QuickFilters/types';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { useFieldKeys } from './hooks/useFieldKeys';

function OtherFiltersSkeleton(): JSX.Element {
	return (
		<>
			{Array.from({ length: 5 }).map((_, index) => (
				<Skeleton.Input
					active
					size="small"
					className="qf-other-filters-skeleton"
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
	const isMeterDataSource = useMemo(
		() => signal && signal === SignalType.METER_EXPLORER,
		[signal],
	);

	const { filters: fieldKeyFilters, isFetching: isFetchingFieldKeys } =
		useFieldKeys({
			signal,
			searchText: inputValue,
			enabled: !!signal && !isMeterDataSource,
		});

	const { data: meterFieldKeysData, isLoading: isLoadingMeterFieldKeys } =
		useGetQueryKeySuggestions(
			{
				searchText: inputValue,
				signal: SIGNAL_DATA_SOURCE_MAP[signal as SignalType],
				signalSource: 'meter',
			},
			{
				queryKey: [REACT_QUERY_KEY.GET_OTHER_FILTERS, inputValue],
				enabled: !!signal && isMeterDataSource,
			},
		);

	const otherFilters = useMemo(() => {
		let filterAttributes: FilterType[];
		if (isMeterDataSource) {
			const fieldKeys: QueryKeyDataSuggestionsProps[] = Object.values(
				meterFieldKeysData?.data?.data?.keys || {},
			)?.flat();
			filterAttributes = fieldKeys.map((attr) => ({
				key: attr.name,
				dataType: attr.fieldDataType || '',
				type: attr.fieldContext || '',
			}));
		} else {
			filterAttributes = fieldKeyFilters;
		}
		return filterAttributes?.filter(
			(attr) => !addedFilters.some((filter) => filter.key === attr.key),
		);
	}, [addedFilters, fieldKeyFilters, isMeterDataSource, meterFieldKeysData]);

	const handleAddFilter = (filter: FilterType): void => {
		setAddedFilters((prev) => [
			...prev,
			{
				key: filter.key,
				dataType: filter.dataType,
				type: filter.type,
			},
		]);
	};

	const renderFilters = (): React.ReactNode => {
		const isLoading = isFetchingFieldKeys || isLoadingMeterFieldKeys;
		if (isLoading) {
			return <OtherFiltersSkeleton />;
		}
		if (!otherFilters?.length) {
			return <div className="no-values-found">No values found</div>;
		}

		return otherFilters.map((filter) => (
			<div key={filter.key} className="qf-filter-item other-filters-item">
				<div className="qf-filter-key">{filter.key}</div>
				<Button
					className="add-filter-btn periscope-btn"
					size="small"
					onClick={(): void => handleAddFilter(filter)}
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
