import './CeleryOverviewConfigOptions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Select, Spin, Tooltip } from 'antd';
import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from 'components/CeleryTask/CeleryUtils';
import { useCeleryFilterOptions } from 'components/CeleryTask/useCeleryFilterOptions';
import { SelectMaxTagPlaceholder } from 'components/MessagingQueues/MQCommon/MQCommon';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';

interface SelectOptionConfig {
	placeholder: string;
	queryParam: QueryParams;
	filterType: 'serviceName' | 'spanName' | 'msgSystem';
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
			key={filterType}
			placeholder={placeholder}
			showSearch
			mode="multiple"
			options={options}
			loading={isFetching}
			className="config-select-option"
			onSearch={handleSearch}
			maxTagCount={4}
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
	const [isURLCopied, setIsURLCopied] = useState(false);

	const [, handleCopyToClipboard] = useCopyToClipboard();

	const selectConfigs: SelectOptionConfig[] = [
		{
			placeholder: 'Service Name',
			queryParam: QueryParams.service,
			filterType: 'serviceName',
		},
		// {
		// 	placeholder: 'Span Name',
		// 	queryParam: QueryParams.spanName,
		// 	filterType: 'spanName',
		// },
		// {
		// 	placeholder: 'Msg System',
		// 	queryParam: QueryParams.msgSystem,
		// 	filterType: 'msgSystem',
		// },
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
			<div className="celery-filters">
				{selectConfigs.map((config) => (
					<FilterSelect
						key={config.filterType}
						placeholder={config.placeholder}
						queryParam={config.queryParam}
						filterType={config.filterType}
					/>
				))}
			</div>
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
