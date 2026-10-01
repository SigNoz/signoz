import { useMemo } from 'react';
import { Button, Skeleton } from 'antd';
import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { FieldKeysConfig } from 'api/querySuggestions/types';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { SignalType } from 'components/QuickFilters/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import {
	BuilderQueryType,
	FieldContext,
	FieldDataType,
	TelemetryFieldKey,
} from 'types/api/v5/queryRange';
import { DATA_SOURCE_TO_SIGNAL } from 'types/common/queryBuilder';

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
	const isAIObservability = signal === SignalType.AI_OBSERVABILITY;

	const builderQueryType: BuilderQueryType | undefined = isAIObservability
		? 'builder_ai_query'
		: undefined;

	const fieldKeysConfig: FieldKeysConfig = isAIObservability
		? { searchText: inputValue }
		: {
				searchText: inputValue,
				signal: signal
					? DATA_SOURCE_TO_SIGNAL[SIGNAL_DATA_SOURCE_MAP[signal]]
					: undefined,
				source: isMeterDataSource ? TelemetrytypesSourceDTO.meter : undefined,
			};

	const { data: fetchedKeys, isFetching } = useFieldKeysSuggestion(
		fieldKeysConfig,
		builderQueryType,
	);

	const otherFilters = useMemo<TelemetryFieldKey[]>(() => {
		// Normalize: synthesize the composite `key` once so downstream reads (dedupe,
		// add, render) can trust it.
		const suggestions: TelemetryFieldKey[] = (fetchedKeys ?? []).map((attr) => ({
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
	}, [fetchedKeys, addedFilters]);

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
