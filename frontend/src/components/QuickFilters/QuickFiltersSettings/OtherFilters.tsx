import { useMemo } from 'react';
import { Button, Skeleton } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SignalType } from 'components/QuickFilters/types';
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
	const { filters: fieldKeyFilters, isFetching } = useFieldKeys({
		signal,
		searchText: inputValue,
		enabled: !!signal,
	});

	const otherFilters = useMemo(
		() =>
			fieldKeyFilters.filter(
				(attr) => !addedFilters.some((filter) => filter.key === attr.key),
			),
		[addedFilters, fieldKeyFilters],
	);

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
		if (isFetching) {
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
