import { Select, Spin } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useState } from 'react';

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

function MessagingQueuesConfigOptions(): JSX.Element {
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
				notFoundContent={
					isFetchingConsumerGrp ? (
						<span>
							<Spin size="small" /> Loading...
						</span>
					) : (
						<span>No Consumer Groups found</span>
					)
				}
				onChange={(): void => handleConsumerGrpSearch('')}
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
				onChange={(): void => handleTopicSearch('')}
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
				onChange={(): void => handlePartitionSearch('')}
			/>
		</div>
	);
}

export default MessagingQueuesConfigOptions;
