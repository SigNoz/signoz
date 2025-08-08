import './Breakoutoptions.styles.scss';

import { Input, Skeleton } from 'antd';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import useDebounce from 'hooks/useDebounce';
import { ContextMenu } from 'periscope/components/ContextMenu';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

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

	// Using getKeySuggestions directly like in QuerySearch
	const { data, isFetching } = useQuery(
		[
			'keySuggestions',
			queryData.dataSource,
			debouncedSearchText,
			queryData.aggregateAttribute?.key,
		],
		() =>
			getKeySuggestions({
				signal: queryData.dataSource,
				searchText: debouncedSearchText,
				metricName: queryData.aggregateAttribute?.key,
			}),
		{
			enabled: !!queryData,
		},
	);

	const breakoutOptions = useMemo(() => {
		if (!data?.data?.data?.keys) {
			return [];
		}

		const { keys } = data.data.data;
		const transformedOptions: BaseAutocompleteData[] = [];

		// Transform the response to match BaseAutocompleteData format
		Object.values(keys).forEach((keyArray) => {
			keyArray.forEach((keyData) => {
				transformedOptions.push({
					key: keyData.name,
					dataType: DataTypes.EMPTY,
					type: '',
					isColumn: true,
				});
			});
		});

		// Filter out already selected groupBy keys
		const groupByKeys = groupBy.map((item: BaseAutocompleteData) => item.key);
		return transformedOptions.filter(
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
			<div>
				<OverlayScrollbar
					style={{ maxHeight: '200px' }}
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
