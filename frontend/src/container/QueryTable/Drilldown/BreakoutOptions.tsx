import './Breakoutoptions.styles.scss';

import { Input, Skeleton } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { useGetAggregateKeys } from 'hooks/infraMonitoring/useGetAggregateKeys';
import useDebounce from 'hooks/useDebounce';
import { ContextMenu } from 'periscope/components/ContextMenu';
import { useCallback, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { BreakoutOptionsProps } from './contextConfig';

function OptionsSkeleton(): JSX.Element {
	return (
		<div className="breakout-options-skeleton">
			{Array.from({ length: 5 }).map((_, index) => (
				<Skeleton.Input
					active
					size="small"
					// eslint-disable-next-line react/no-array-index-key
					key={index}
				/>
			))}
		</div>
	);
}

function BreakoutOptions({
	queryData,
	onColumnClick,
}: BreakoutOptionsProps): JSX.Element {
	const { groupBy = [] } = queryData;
	const [searchText, setSearchText] = useState<string>('');
	const debouncedSearchText = useDebounce(searchText, 400);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const value = e.target.value.trim().toLowerCase();
			setSearchText(value);
		},
		[],
	);

	// TODO: change the api call to get the keys
	const { isFetching, data } = useGetAggregateKeys(
		{
			aggregateAttribute: queryData.aggregateAttribute?.key || '',
			dataSource: queryData.dataSource,
			aggregateOperator: queryData?.aggregateOperator || '',
			searchText: debouncedSearchText,
		},
		{
			queryKey: [
				queryData?.aggregateAttribute?.key,
				queryData.dataSource,
				queryData.aggregateOperator,
				debouncedSearchText,
			],
			enabled: !!queryData,
		},
	);

	const breakoutOptions = useMemo(() => {
		const groupByKeys = groupBy.map((item: BaseAutocompleteData) => item.key);
		return data?.payload?.attributeKeys?.filter(
			(item: BaseAutocompleteData) => !groupByKeys.includes(item.key),
		);
	}, [data, groupBy]);

	console.log('>> queryData', queryData);
	console.log('>> groupBy', groupBy);
	console.log('>> breakoutOptions', breakoutOptions);

	return (
		<div>
			<section className="search" style={{ padding: '8px 0' }}>
				<Input
					type="text"
					value={searchText}
					placeholder="Search breakout options..."
					onChange={handleInputChange}
				/>
			</section>
			<div style={{ height: '200px' }}>
				<OverlayScrollbar
					options={{
						overflow: {
							x: 'hidden',
						},
					}}
				>
					{/* eslint-disable-next-line react/jsx-no-useless-fragment */}
					<>
						{isFetching ? (
							<OptionsSkeleton />
						) : (
							breakoutOptions?.map((item: BaseAutocompleteData) => (
								<ContextMenu.Item
									key={item.key}
									onClick={(): void => onColumnClick(item)}
								>
									{item.key}
								</ContextMenu.Item>
							))
						)}
					</>
				</OverlayScrollbar>
			</div>
		</div>
	);
}

export default BreakoutOptions;
