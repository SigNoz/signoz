import './CeleryOverviewConfigOptions.styles.scss';

import { Row, Select, Spin } from 'antd';
import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from 'components/CeleryTask/CeleryUtils';
import { useCeleryFilterOptions } from 'components/CeleryTask/useCeleryFilterOptions';
import { SelectMaxTagPlaceholder } from 'components/MessagingQueues/MQCommon/MQCommon';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

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
	const { handleSearch, isFetching, options } = useCeleryFilterOptions(
		filterType,
	);

	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	// Use externally provided `values` if `shouldSetQueryParams` is false, otherwise get from URL params.
	const selectValue =
		!shouldSetQueryParams && !!values?.length
			? values
			: getValuesFromQueryParams(queryParam, urlQuery) || [];

	const handleSelectChange = useCallback(
		(value: string | string[]): void => {
			handleSearch('');
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
		<Select
			key={filterType.toString()}
			placeholder={placeholder}
			showSearch
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...(isMultiple ? { mode: 'multiple' } : {})}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...(isMultiple ? { mode: 'multiple' } : {})}
			options={options}
			loading={isFetching}
			className="config-select-option"
			onSearch={handleSearch}
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
};

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
