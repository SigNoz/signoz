import { useMemo } from 'react';
import { Button, Skeleton } from 'antd';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { DATA_SOURCE_TO_SIGNAL } from 'components/QuickFilters/FilterRenderers/Checkbox/v2/useFieldValues';
import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { SignalType } from 'components/QuickFilters/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import {
	FieldContext,
	FieldDataType,
	TelemetryFieldKey,
} from 'types/api/v5/queryRange';

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

	const { data, isFetching } = useGetFieldsKeys(
		{
			searchText: inputValue,
			signal: signal
				? DATA_SOURCE_TO_SIGNAL[SIGNAL_DATA_SOURCE_MAP[signal]]
				: undefined,
			source: isMeterDataSource ? TelemetrytypesSourceDTO.meter : undefined,
		},
		{ query: { enabled: !!signal } },
	);

	const otherFilters = useMemo<TelemetryFieldKey[]>(() => {
		const rawSuggestions = Object.values(data?.data?.keys ?? {}).flat();
		// Normalize: synthesize the composite `key` once so downstream reads (dedupe,
		// add, render) can trust it.
		const suggestions: TelemetryFieldKey[] = rawSuggestions.map((attr) => ({
			name: attr.name,
			signal: attr.signal as TelemetryFieldKey['signal'],
			fieldContext: attr.fieldContext as FieldContext,
			fieldDataType: attr.fieldDataType as FieldDataType,
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
