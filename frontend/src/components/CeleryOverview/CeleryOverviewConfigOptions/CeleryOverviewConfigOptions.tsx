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
import { useHistory, useLocation } from 'react-router-dom';

interface SelectOptionConfig {
	placeholder: string;
	queryParam: QueryParams;
	filterType: string | string[];
}

function FilterSelect({
	placeholder,
	queryParam,
	filterType,
}: SelectOptionConfig): JSX.Element {
	const { handleSearch, isFetching, options } = useCeleryFilterOptions(
		filterType,
	);

	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	return (
		<Select
			key={filterType.toString()}
			placeholder={placeholder}
			showSearch
			mode="multiple"
			options={options}
			loading={isFetching}
			className="config-select-option"
			onSearch={handleSearch}
			maxTagCount={4}
			allowClear
			maxTagPlaceholder={SelectMaxTagPlaceholder}
			value={getValuesFromQueryParams(queryParam, urlQuery) || []}
			notFoundContent={
				isFetching ? (
					<span>
						<Spin size="small" /> Loading...
					</span>
				) : (
					<span>No {placeholder} found</span>
				)
			}
			onChange={(value): void => {
				handleSearch('');
				setQueryParamsFromOptions(value, urlQuery, history, location, queryParam);
			}}
		/>
	);
}

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
