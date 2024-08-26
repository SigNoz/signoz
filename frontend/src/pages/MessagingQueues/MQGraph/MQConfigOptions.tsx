import { Select, Spin } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { QueryParams } from 'constants/query';
import { History, Location } from 'history';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import useUrlQuery from 'hooks/useUrlQuery';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { SelectMaxTagPlaceholder } from '../MQCommon/MQCommon';
import { useGetAllConfigOptions } from './useGetAllConfigOptions';

type ConfigOptionType = 'group' | 'topic' | 'partition';

const getPlaceholder = (type: ConfigOptionType): string => {
	switch (type) {
		case 'group':
			return 'Consumer Groups';
		case 'topic':
			return 'Topics';
		case 'partition':
			return 'Partitions';
		default:
			return '';
	}
};

const useConfigOptions = (
	type: ConfigOptionType,
): {
	searchText: string;
	handleSearch: (value: string) => void;
	isFetching: boolean;
	options: DefaultOptionType[];
} => {
	const [searchText, setSearchText] = useState<string>('');
	const { isFetching, options } = useGetAllConfigOptions({
		attributeKey: type,
		searchText,
	});
	const handleDebouncedSearch = useDebouncedFn((searchText): void => {
		setSearchText(searchText as string);
	}, 500);

	const handleSearch = (value: string): void => {
		handleDebouncedSearch(value || '');
	};

	return { searchText, handleSearch, isFetching, options };
};

function setQueryParamsForConfigOptions(
	value: string[],
	urlQuery: URLSearchParams,
	history: History<unknown>,
	location: Location<unknown>,
	queryParams: QueryParams,
): void {
	urlQuery.set(queryParams, value.join(','));
	const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
	history.replace(generatedUrl);
}

function getConfigValuesFromQueryParams(
	queryParams: QueryParams,
	urlQuery: URLSearchParams,
): string[] {
	const value = urlQuery.get(queryParams);
	return value ? value.split(',') : [];
}

function MessagingQueuesConfigOptions(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const history = useHistory();

	const {
		handleSearch: handleConsumerGrpSearch,
		isFetching: isFetchingConsumerGrp,
		options: consumerGrpOptions,
	} = useConfigOptions('group');
	const {
		handleSearch: handleTopicSearch,
		isFetching: isFetchingTopic,
		options: topicOptions,
	} = useConfigOptions('topic');
	const {
		handleSearch: handlePartitionSearch,
		isFetching: isFetchingPartition,
		options: partitionOptions,
	} = useConfigOptions('partition');

	return (
		<div className="config-options">
			<Select
				placeholder={getPlaceholder('group')}
				showSearch
				mode="multiple"
				options={consumerGrpOptions}
				loading={isFetchingConsumerGrp}
				className="config-select-option"
				onSearch={handleConsumerGrpSearch}
				maxTagCount={4}
				maxTagPlaceholder={SelectMaxTagPlaceholder}
				value={
					getConfigValuesFromQueryParams(QueryParams.consumerGrp, urlQuery) || []
				}
				notFoundContent={
					isFetchingConsumerGrp ? (
						<span>
							<Spin size="small" /> Loading...
						</span>
					) : (
						<span>No Consumer Groups found</span>
					)
				}
				onChange={(value): void => {
					handleConsumerGrpSearch('');
					setQueryParamsForConfigOptions(
						value,
						urlQuery,
						history,
						location,
						QueryParams.consumerGrp,
					);
				}}
			/>
			<Select
				placeholder={getPlaceholder('topic')}
				showSearch
				mode="multiple"
				options={topicOptions}
				loading={isFetchingTopic}
				onSearch={handleTopicSearch}
				className="config-select-option"
				maxTagCount={4}
				value={getConfigValuesFromQueryParams(QueryParams.topic, urlQuery) || []}
				maxTagPlaceholder={SelectMaxTagPlaceholder}
				notFoundContent={
					isFetchingTopic ? (
						<span>
							<Spin size="small" /> Loading...
						</span>
					) : (
						<span>No Topics found</span>
					)
				}
				onChange={(value): void => {
					handleTopicSearch('');
					setQueryParamsForConfigOptions(
						value,
						urlQuery,
						history,
						location,
						QueryParams.topic,
					);
				}}
			/>
			<Select
				placeholder={getPlaceholder('partition')}
				showSearch
				mode="multiple"
				options={partitionOptions}
				loading={isFetchingPartition}
				className="config-select-option"
				onSearch={handlePartitionSearch}
				maxTagCount={4}
				value={
					getConfigValuesFromQueryParams(QueryParams.partition, urlQuery) || []
				}
				maxTagPlaceholder={SelectMaxTagPlaceholder}
				notFoundContent={
					isFetchingPartition ? (
						<span>
							<Spin size="small" /> Loading...
						</span>
					) : (
						<span>No Partitions found</span>
					)
				}
				onChange={(value): void => {
					handlePartitionSearch('');
					setQueryParamsForConfigOptions(
						value,
						urlQuery,
						history,
						location,
						QueryParams.partition,
					);
				}}
			/>
		</div>
	);
}

export default MessagingQueuesConfigOptions;
