import './CeleryOverviewConfigOptions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Row, Select, Spin, Tooltip } from 'antd';
import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from 'components/CeleryTask/CeleryUtils';
import {
	FilterCofigs,
	useCeleryFilterOptions,
} from 'components/CeleryTask/useCeleryFilterOptions';
import { SelectMaxTagPlaceholder } from 'components/MessagingQueues/MQCommon/MQCommon';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { DataSource } from 'types/common/queryBuilder';

interface SelectOptionConfig {
	placeholder: string;
	queryParam: QueryParams;
	filterType: string | string[];
	filterConfigs?: FilterCofigs;
}

function FilterSelect({
	placeholder,
	queryParam,
	filterType,
	filterConfigs,
}: SelectOptionConfig): JSX.Element {
	const { handleSearch, isFetching, options } = useCeleryFilterOptions(
		filterType,
		filterConfigs,
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

FilterSelect.defaultProps = {
	filterConfigs: undefined,
};

function CeleryOverviewConfigOptions(): JSX.Element {
	const [isURLCopied, setIsURLCopied] = useState(false);

	const [, handleCopyToClipboard] = useCopyToClipboard();

	const selectConfigs: SelectOptionConfig[] = [
		{
			placeholder: 'Environment',
			queryParam: QueryParams.environment,
			filterType: 'resource_deployment_environment',
			filterConfigs: {
				aggregateOperator: 'rate',
				dataSource: DataSource.METRICS,
				aggregateAttribute: 'signoz_calls_total',
			},
		},
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

	const handleShareURL = (): void => {
		handleCopyToClipboard(window.location.href);
		setIsURLCopied(true);
		setTimeout(() => {
			setIsURLCopied(false);
		}, 1000);
	};

	return (
		<div className="celery-overview-filters">
			<Row className="celery-filters">
				{selectConfigs.map((config) => (
					<FilterSelect
						key={config.filterType.toString()}
						placeholder={config.placeholder}
						queryParam={config.queryParam}
						filterType={config.filterType}
						filterConfigs={config.filterConfigs}
					/>
				))}
			</Row>
			<Tooltip title="Share this" arrow={false}>
				<Button
					className="periscope-btn copy-url-btn"
					onClick={handleShareURL}
					icon={
						isURLCopied ? (
							<Check size={14} color={Color.BG_FOREST_500} />
						) : (
							<Share2 size={14} />
						)
					}
				/>
			</Tooltip>
		</div>
	);
}

export default CeleryOverviewConfigOptions;
