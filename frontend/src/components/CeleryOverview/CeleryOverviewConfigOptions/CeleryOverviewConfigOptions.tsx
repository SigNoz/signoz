import { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Row } from 'antd';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from 'components/CeleryTask/CeleryUtils';
import { useCeleryFilterOptions } from 'components/CeleryTask/useCeleryFilterOptions';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';

import './CeleryOverviewConfigOptions.styles.scss';

export interface SelectOptionConfig {
	placeholder: string;
	queryParam: QueryParams;
	filterType: string | string[];
	shouldSetQueryParams?: boolean;
	onChange?: (value: string | string[]) => void;
	values?: string | string[];
	isMultiple?: boolean;
}

export function FilterSelect({
	placeholder,
	queryParam,
	filterType,
	values,
	shouldSetQueryParams,
	onChange,
	isMultiple,
}: SelectOptionConfig): JSX.Element {
	const { handleSearch, isFetching, options } =
		useCeleryFilterOptions(filterType);

	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	// Add state to track the current search input
	const [searchValue, setSearchValue] = useState<string>('');

	// Use externally provided `values` if `shouldSetQueryParams` is false, otherwise get from URL params.
	const selectValue =
		!shouldSetQueryParams && !!values?.length
			? values
			: getValuesFromQueryParams(queryParam, urlQuery) || [];

	// Memoize options to include the typed value if not present
	const mergedOptions = useMemo<ComboboxSimpleItem[]>(() => {
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
					history,
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
			history,
			location,
			queryParam,
			onChange,
		],
	);

	return (
		<ComboboxSimple
			key={filterType.toString()}
			placeholder={placeholder}
			multiple={isMultiple}
			items={mergedOptions}
			loading={isFetching}
			className="config-select-option"
			value={selectValue}
			emptyPlaceholder={`No ${placeholder} found`}
			onChange={handleSelectChange}
		/>
	);
}

FilterSelect.defaultProps = {
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
					/>
				))}
			</Row>
		</div>
	);
}

export default CeleryOverviewConfigOptions;
