import { useCallback, useMemo, useState } from 'react';
import { Row, Select, Spin } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from 'components/CeleryTask/CeleryUtils';
import { useCeleryFilterOptions } from 'components/CeleryTask/useCeleryFilterOptions';
import { SelectMaxTagPlaceholder } from 'components/MessagingQueues/MQCommon/MQCommon';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';

import './CeleryOverviewConfigOptions.styles.scss';

// Canonical OpenTelemetry messaging systems available in the queue overview filter bar.
export const SUPPORTED_MESSAGING_SYSTEMS = [
	'kafka',
	'celery',
	'aws_sqs',
	'gcp_pubsub',
	'aws_kinesis',
	'redis',
] as const;

// Span attribute keys queried when resolving queue, topic, stream, or database destinations.
export const DESTINATION_FILTER_ATTRIBUTES: string[] = [
	'messaging.destination.name',
	'messaging.destination',
	'aws.sqs.queue.name',
	'aws.kinesis.stream.name',
	'celery.task_name',
	'db.redis.database_index',
];

const DEFAULT_MESSAGING_SYSTEM_OPTIONS: DefaultOptionType[] =
	SUPPORTED_MESSAGING_SYSTEMS.map((system) => ({
		label: system,
		value: system,
	}));

export interface SelectOptionConfig {
	placeholder: string;
	queryParam: QueryParams;
	filterType: string | string[];
	shouldSetQueryParams?: boolean;
	onChange?: (value: string | string[]) => void;
	values?: string | string[];
	isMultiple?: boolean;
	defaultOptions?: DefaultOptionType[];
}

interface MergeOptionsParams {
	dynamicOptions: DefaultOptionType[];
	defaultOptions?: DefaultOptionType[];
	searchValue: string;
}

// mergeFilterOptions deduplicates static queue options and dynamic autocomplete values
// while prepending any custom user-typed search token.
function mergeFilterOptions({
	dynamicOptions,
	defaultOptions = [],
	searchValue,
}: MergeOptionsParams): DefaultOptionType[] {
	const seen = new Set<string>();
	const combined: DefaultOptionType[] = [];

	const trimmedSearch = searchValue.trim();
	if (trimmedSearch.length > 0) {
		seen.add(trimmedSearch);
		combined.push({ value: trimmedSearch, label: trimmedSearch });
	}

	[...defaultOptions, ...dynamicOptions].forEach((opt) => {
		const key = String(opt.value ?? '');
		if (key && !seen.has(key)) {
			seen.add(key);
			combined.push(opt);
		}
	});

	return combined;
}

export function FilterSelect({
	placeholder,
	queryParam,
	filterType,
	values,
	shouldSetQueryParams,
	onChange,
	isMultiple,
	defaultOptions,
}: SelectOptionConfig): JSX.Element {
	const { handleSearch, isFetching, options } =
		useCeleryFilterOptions(filterType);

	const urlQuery = useUrlQuery();
	const location = useAppLocation();
	const [searchValue, setSearchValue] = useState<string>('');

	// Prefer externally controlled values when URL parameter synchronization is disabled.
	const selectValue =
		!shouldSetQueryParams && !!values?.length
			? values
			: getValuesFromQueryParams(queryParam, urlQuery) || [];

	const mergedOptions = useMemo(
		() =>
			mergeFilterOptions({
				dynamicOptions: options,
				defaultOptions,
				searchValue,
			}),
		[options, defaultOptions, searchValue],
	);

	const handleSelectChange = useCallback(
		(value: string | string[]): void => {
			handleSearch('');
			setSearchValue('');
			if (shouldSetQueryParams) {
				setQueryParamsFromOptions(
					value as string[],
					urlQuery,
					navigate,
					location,
					queryParam,
				);
			}
			onChange?.(value);
		},
		[
			handleSearch,
			shouldSetQueryParams,
			urlQuery,
			location,
			queryParam,
			onChange,
		],
	);

	const handleSearchInput = (input: string): void => {
		setSearchValue(input);
		handleSearch(input);
	};

	return (
		<Select
			key={filterType.toString()}
			placeholder={placeholder}
			showSearch
			{...(isMultiple ? { mode: 'multiple' } : {})}
			options={mergedOptions}
			loading={isFetching}
			className="config-select-option"
			onSearch={handleSearchInput}
			maxTagCount={4}
			allowClear
			maxTagPlaceholder={SelectMaxTagPlaceholder}
			value={selectValue}
			notFoundContent={
				isFetching ? (
					<span>
						<Spin size="small" /> Loading...
					</span>
				) : (
					<span>No {placeholder} found</span>
				)
			}
			onChange={handleSelectChange}
		/>
	);
}

FilterSelect.defaultProps = {
	shouldSetQueryParams: true,
	onChange: (): void => {},
	values: [],
	isMultiple: true,
	defaultOptions: [],
};

function CeleryOverviewConfigOptions(): JSX.Element {
	const selectConfigs: SelectOptionConfig[] = [
		{
			placeholder: 'Service Name',
			queryParam: QueryParams.service,
			filterType: 'serviceName',
		},
		{
			placeholder: 'Span Name',
			queryParam: QueryParams.spanName,
			filterType: 'name',
		},
		{
			placeholder: 'Msg System',
			queryParam: QueryParams.msgSystem,
			filterType: ['messaging.system', 'db.system'],
			defaultOptions: DEFAULT_MESSAGING_SYSTEM_OPTIONS,
		},
		{
			placeholder: 'Destination',
			queryParam: QueryParams.destination,
			filterType: DESTINATION_FILTER_ATTRIBUTES,
		},
		{
			placeholder: 'Kind',
			queryParam: QueryParams.kindString,
			filterType: 'kind_string',
		},
	];

	return (
		<div className="celery-overview-filters">
			<Row className="celery-filters">
				{selectConfigs.map((config) => (
					<FilterSelect
						key={config.filterType.toString()}
						placeholder={config.placeholder}
						queryParam={config.queryParam}
						filterType={config.filterType}
						defaultOptions={config.defaultOptions}
					/>
				))}
			</Row>
		</div>
	);
}

export default CeleryOverviewConfigOptions;
