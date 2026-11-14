import { useCallback, useMemo, useState } from 'react';
import { Row, Select, Spin } from 'antd';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
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

export interface SelectOptionConfig {
	placeholder: string;
	queryParam: QueryParams;
	filterType: string | string[];
	fieldContext?: TelemetrytypesFieldContextDTO;
	shouldSetQueryParams?: boolean;
	onChange?: (value: string | string[]) => void;
	values?: string | string[];
	isMultiple?: boolean;
}

export function FilterSelect({
	placeholder,
	queryParam,
	filterType,
	fieldContext,
	values,
	shouldSetQueryParams,
	onChange,
	isMultiple,
}: SelectOptionConfig): JSX.Element {
	const { handleSearch, isFetching, options } = useCeleryFilterOptions(
		filterType,
		fieldContext,
	);

	const urlQuery = useUrlQuery();
	const location = useAppLocation();

	// Add state to track the current search input
	const [searchValue, setSearchValue] = useState<string>('');

	// Use externally provided `values` if `shouldSetQueryParams` is false, otherwise get from URL params.
	const selectValue =
		!shouldSetQueryParams && !!values?.length
			? values
			: getValuesFromQueryParams(queryParam, urlQuery) || [];

	// Memoize options to include the typed value if not present
	const mergedOptions = useMemo(() => {
		if (
			!!searchValue.trim().length &&
			!options.some((opt) => opt.value === searchValue)
		) {
			return [{ value: searchValue, label: searchValue }, ...options];
		}
		return options;
	}, [options, searchValue]);

	const handleSelectChange = useCallback(
		(value: string | string[]): void => {
			handleSearch('');
			setSearchValue(''); // Clear search value after selection
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

	// Update searchValue on user input
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
	fieldContext: undefined,
	shouldSetQueryParams: true,
	onChange: (): void => {},
	values: [],
	isMultiple: true,
};

function CeleryOverviewConfigOptions(): JSX.Element {
	const selectConfigs: SelectOptionConfig[] = [
		{
			placeholder: 'Service Name',
			queryParam: QueryParams.service,
			filterType: 'service.name',
			fieldContext: TelemetrytypesFieldContextDTO.resource,
		},
		{
			placeholder: 'Span Name',
			queryParam: QueryParams.spanName,
			filterType: 'name',
			fieldContext: TelemetrytypesFieldContextDTO.span,
		},
		{
			placeholder: 'Msg System',
			queryParam: QueryParams.msgSystem,
			filterType: 'messaging.system',
		},
		{
			placeholder: 'Destination',
			queryParam: QueryParams.destination,
			filterType: ['messaging.destination.name', 'messaging.destination'],
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
						fieldContext={config.fieldContext}
					/>
				))}
			</Row>
		</div>
	);
}

export default CeleryOverviewConfigOptions;
