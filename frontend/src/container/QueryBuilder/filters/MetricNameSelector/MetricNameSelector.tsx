import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AutoComplete, Spin } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { useListMetrics } from 'api/generated/services/metrics';
import { MetricsexplorertypesListMetricDTO } from 'api/generated/services/sigNoz.schemas';
import { ATTRIBUTE_TYPES, toAttributeType } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebounce from 'hooks/useDebounce';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { ExtendedSelectOption } from 'types/common/select';
import { popupContainer } from 'utils/selectPopupContainer';

import { selectStyle } from '../QueryBuilderSearch/config';
import OptionRenderer from '../QueryBuilderSearch/OptionRenderer';

import './MetricNameSelector.styles.scss';

export type MetricNameSelectorProps = {
	query: IBuilderQuery;
	onChange: (value: BaseAutocompleteData, isEditMode?: boolean) => void;
	disabled?: boolean;
	defaultValue?: string;
	onSelect?: (value: BaseAutocompleteData) => void;
	signalSource?: 'meter' | '';
	'data-testid'?: string;
};

function getAttributeType(
	metric: MetricsexplorertypesListMetricDTO,
): ATTRIBUTE_TYPES | '' {
	return toAttributeType(metric.type, metric.isMonotonic);
}

function createAutocompleteData(
	metricName: string,
	type: string,
): BaseAutocompleteData {
	return { key: metricName, type, dataType: DataTypes.Float64 };
}

// N.B on the metric name selector behaviour.
//
// Metric aggregation options resolution:
//   The component maintains a ref (metricsRef) of the latest API results.
//   When the user commits a metric name (via dropdown select, blur, or Cmd+Enter),
//   resolveMetricFromText looks up the metric in metricsRef to determine its type
//   (Sum, Gauge, Histogram, etc.). If the metric isn't found (e.g. the user typed
//   a name before the debounced search returned), the type is empty and downstream
//   treats it as unknown.
//
// Selection handling:
//   - Dropdown select: user picks from the dropdown; type is always resolved
//      since the option came from the current API results.
//   - Blur: user typed a name and tabbed/clicked away without selecting from
//      the dropdown. If the name differs from the current metric, it's resolved
//      and committed. If the input is empty, it resets to the current metric name.
//   - Cmd/Ctrl+Enter: resolves the typed name and commits it using flushSync
//      so the state update is processed synchronously before QueryBuilderV2's
//      onKeyDownCapture fires handleRunQuery. Uses document-level capture phase
//      to run before React's root-level event dispatch. However, there is still one
//      need to be handled here. TODO(srikanthccv): enter before n/w req completion
//
// Edit mode:
//   When a saved query is loaded, the metric name may be set via aggregations
//   but aggregateAttribute.type may be missing. Once the API returns metric data,
//   the component calls onChange with isEditMode=true to backfill the type without
//   resetting aggregation options.
//
// Signal source:
//   When signalSource is 'meter', the API is filtered to meter metrics only.
//   Changing signalSource clears the input and search text.

export const MetricNameSelector = memo(function MetricNameSelector({
	query,
	onChange,
	disabled,
	defaultValue,
	onSelect,
	signalSource,
	'data-testid': dataTestId,
}: MetricNameSelectorProps): JSX.Element {
	const currentMetricName =
		(query.aggregations?.[0] as MetricAggregation)?.metricName ||
		query.aggregateAttribute?.key ||
		'';

	const [inputValue, setInputValue] = useState<string>(
		currentMetricName || defaultValue || '',
	);
	const [searchText, setSearchText] = useState<string>(currentMetricName);

	const metricsRef = useRef<MetricsexplorertypesListMetricDTO[]>([]);
	const selectedFromDropdownRef = useRef(false);
	const prevSignalSourceRef = useRef(signalSource);

	useEffect(() => {
		setInputValue(currentMetricName || defaultValue || '');
		if (currentMetricName) {
			setSearchText(currentMetricName);
		}
	}, [defaultValue, currentMetricName]);

	useEffect(() => {
		if (prevSignalSourceRef.current !== signalSource) {
			const previousSignalSource = prevSignalSourceRef.current;
			prevSignalSourceRef.current = signalSource;

			const isNormalizationTransition =
				(previousSignalSource === undefined && signalSource === '') ||
				(previousSignalSource === '' && signalSource === undefined);

			if (isNormalizationTransition && currentMetricName) {
				setSearchText(currentMetricName);
				setInputValue(currentMetricName || defaultValue || '');
				return;
			}

			setSearchText('');
			setInputValue('');
		}
	}, [signalSource, currentMetricName, defaultValue]);

	const debouncedValue = useDebounce(searchText, DEBOUNCE_DELAY);

	const {
		isFetching,
		isError,
		data: listMetricsData,
	} = useListMetrics(
		{
			searchText: debouncedValue,
			limit: 100,
			source: signalSource || undefined,
		} as Record<string, unknown>,
		{
			query: {
				keepPreviousData: false,
				retry: 2,
			},
		},
	);

	const metrics = useMemo(
		() => listMetricsData?.data?.metrics ?? [],
		[listMetricsData],
	);

	useEffect(() => {
		metricsRef.current = metrics;
	}, [metrics]);

	const optionsData = useMemo((): ExtendedSelectOption[] => {
		if (!metrics.length) {
			return [];
		}

		return metrics.map((metric) => ({
			label: (
				<OptionRenderer
					label={metric.metricName}
					value={metric.metricName}
					dataType={DataTypes.Float64}
					type={getAttributeType(metric) || ''}
				/>
			),
			value: metric.metricName,
			key: metric.metricName,
		}));
	}, [metrics]);

	useEffect(() => {
		const metricName =
			(query.aggregations?.[0] as MetricAggregation)?.metricName ||
			query.aggregateAttribute?.key;
		const hasAggregateAttributeType = query.aggregateAttribute?.type;

		if (metricName && !hasAggregateAttributeType && metrics.length > 0) {
			const found = metrics.find((m) => m.metricName === metricName);
			if (found) {
				onChange(
					createAutocompleteData(found.metricName, getAttributeType(found)),
					true,
				);
			}
		}
	}, [
		metrics,
		query.aggregations,
		query.aggregateAttribute?.key,
		query.aggregateAttribute?.type,
		onChange,
	]);

	const resolveMetricFromText = useCallback(
		(text: string): BaseAutocompleteData => {
			const found = metricsRef.current.find((m) => m.metricName === text);
			if (found) {
				return createAutocompleteData(found.metricName, getAttributeType(found));
			}
			return createAutocompleteData(text, '');
		},
		[],
	);

	const placeholder = useMemo(() => {
		if (signalSource === 'meter') {
			return 'Search for a meter metric...';
		}
		return 'Search for a metric...';
	}, [signalSource]);

	const handleChange = useCallback((value: string): void => {
		setInputValue(value);
	}, []);

	const handleSearch = useCallback((value: string): void => {
		setSearchText(value);
		selectedFromDropdownRef.current = false;
	}, []);

	const handleSelect = useCallback(
		(value: string): void => {
			selectedFromDropdownRef.current = true;
			const resolved = resolveMetricFromText(value);
			onChange(resolved);
			if (onSelect) {
				onSelect(resolved);
			}
			setSearchText('');
		},
		[onChange, onSelect, resolveMetricFromText],
	);

	const handleBlur = useCallback(() => {
		if (selectedFromDropdownRef.current) {
			selectedFromDropdownRef.current = false;
			return;
		}

		const typedValue = inputValue?.trim() || '';
		if (typedValue && typedValue !== currentMetricName) {
			onChange(resolveMetricFromText(typedValue));
		} else if (!typedValue && currentMetricName) {
			setInputValue(currentMetricName);
		}
	}, [inputValue, currentMetricName, onChange, resolveMetricFromText]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
				const typedValue = inputValue?.trim() || '';
				if (typedValue && typedValue !== currentMetricName) {
					flushSync(() => {
						onChange(resolveMetricFromText(typedValue));
					});
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown, true);
		return (): void => {
			document.removeEventListener('keydown', handleKeyDown, true);
		};
	}, [inputValue, currentMetricName, onChange, resolveMetricFromText]);

	return (
		<AutoComplete
			className="metric-name-selector"
			getPopupContainer={popupContainer}
			style={selectStyle}
			filterOption={false}
			placeholder={placeholder}
			onSearch={handleSearch}
			onChange={handleChange}
			notFoundContent={
				isFetching ? (
					<Spin size="small" />
				) : isError ? (
					<Typography.Text color="danger" style={{ fontSize: 12 }}>
						Failed to load metrics
					</Typography.Text>
				) : null
			}
			data-testid={dataTestId}
			options={optionsData}
			value={inputValue}
			onBlur={handleBlur}
			onSelect={handleSelect}
			disabled={disabled}
		/>
	);
});
