import { useMemo } from 'react';
import { Button, Skeleton } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { SignalType } from 'components/QuickFilters/types';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { FieldContext, TelemetryFieldKey } from 'types/api/v5/queryRange';

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
	addedFilters: TelemetryFieldKey[];
	setAddedFilters: React.Dispatch<React.SetStateAction<TelemetryFieldKey[]>>;
}): JSX.Element {
	const isMeterDataSource = signal === SignalType.METER_EXPLORER;

	const { data, isFetching } = useGetQueryKeySuggestions(
		{
			searchText: inputValue,
			signal: SIGNAL_DATA_SOURCE_MAP[signal as SignalType],
			signalSource: isMeterDataSource ? 'meter' : '',
		},
		{
			queryKey: [REACT_QUERY_KEY.GET_OTHER_FILTERS, signal, inputValue],
			enabled: !!signal,
		},
	);

	const otherFilters = useMemo<TelemetryFieldKey[]>(() => {
		const rawSuggestions = Object.values(data?.data?.data?.keys || {}).flat();
		// Normalize: synthesize the composite `key` once so downstream reads (dedupe,
		// add, render) can trust it.
		const suggestions: TelemetryFieldKey[] = rawSuggestions.map((attr) => ({
			name: attr.name,
			signal: attr.signal,
			fieldContext: attr.fieldContext as FieldContext,
			fieldDataType: attr.fieldDataType,
			key: buildCompositeKey(attr.name, attr.fieldContext, attr.fieldDataType),
		}));

		const addedKeys = new Set(
			addedFilters.map((filter) =>
				buildCompositeKey(filter.name, filter.fieldContext, filter.fieldDataType),
			),
		);
		return suggestions.filter((attr) => !addedKeys.has(attr.key as string));
	}, [data, addedFilters]);

	const handleAddFilter = (filter: TelemetryFieldKey): void => {
		setAddedFilters((prev) => [...prev, filter]);
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
				<div className="qf-filter-key">{filter.name}</div>
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
