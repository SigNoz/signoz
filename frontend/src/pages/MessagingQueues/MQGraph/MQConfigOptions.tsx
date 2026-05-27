import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip } from 'antd';
import { ComboboxSimple, type ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { QueryParams } from 'constants/query';
import { History, Location } from 'history';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, Share2 } from '@signozhq/icons';

import { FeatureKeys } from '../../../constants/features';
import { useAppContext } from '../../../providers/App/App';
import { useGetAllConfigOptions } from './useGetAllConfigOptions';

import './MQConfigOptions.styles.scss';

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
	options: ComboboxSimpleItem[];
} => {
	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const [searchText, setSearchText] = useState<string>('');
	const { isFetching, options } = useGetAllConfigOptions(
		{
			attributeKey: type,
			searchText,
		},
		dotMetricsEnabled,
	);
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

	const resetTabularConfigDetailsOnChange = (): void => {
		urlQuery.delete(QueryParams.selectedTimelineQuery);
		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
		history.replace(generatedUrl);
	};

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

	const [isURLCopied, setIsURLCopied] = useState(false);

	const [, handleCopyToClipboard] = useCopyToClipboard();

	return (
		<div className="mq-config">
			<div className="config-options">
				<ComboboxSimple
					placeholder={getPlaceholder('group')}
					multiple
					items={consumerGrpOptions}
					loading={isFetchingConsumerGrp}
					className="config-select-option"
					maxDisplayedPills={4}
					emptyPlaceholder="No Consumer Groups found"
					value={
						getConfigValuesFromQueryParams(QueryParams.consumerGrp, urlQuery) || []
					}
					onChange={(value): void => {
						handleConsumerGrpSearch('');
						setQueryParamsForConfigOptions(
							value as string[],
							urlQuery,
							history,
							location,
							QueryParams.consumerGrp,
						);
						resetTabularConfigDetailsOnChange();
					}}
				/>
				<ComboboxSimple
					placeholder={getPlaceholder('topic')}
					multiple
					items={topicOptions}
					loading={isFetchingTopic}
					className="config-select-option"
					maxDisplayedPills={4}
					emptyPlaceholder="No Topics found"
					value={getConfigValuesFromQueryParams(QueryParams.topic, urlQuery) || []}
					onChange={(value): void => {
						handleTopicSearch('');
						setQueryParamsForConfigOptions(
							value as string[],
							urlQuery,
							history,
							location,
							QueryParams.topic,
						);
						resetTabularConfigDetailsOnChange();
					}}
				/>
				<ComboboxSimple
					placeholder={getPlaceholder('partition')}
					multiple
					items={partitionOptions}
					loading={isFetchingPartition}
					className="config-select-option"
					maxDisplayedPills={4}
					emptyPlaceholder="No Partitions found"
					value={
						getConfigValuesFromQueryParams(QueryParams.partition, urlQuery) || []
					}
					onChange={(value): void => {
						handlePartitionSearch('');
						setQueryParamsForConfigOptions(
							value as string[],
							urlQuery,
							history,
							location,
							QueryParams.partition,
						);
						resetTabularConfigDetailsOnChange();
					}}
				/>
			</div>
			<Tooltip title="Share This" arrow={false}>
				<Button
					className="periscope-btn copy-url-btn"
					onClick={(): void => {
						handleCopyToClipboard(window.location.href);
						setIsURLCopied(true);
						setTimeout(() => {
							setIsURLCopied(false);
						}, 1000);
					}}
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

export default MessagingQueuesConfigOptions;
