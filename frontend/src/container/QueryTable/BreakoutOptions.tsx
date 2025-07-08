import './Breakoutoptions.styles.scss';

import { Skeleton } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { useGetAggregateKeys } from 'hooks/infraMonitoring/useGetAggregateKeys';
import { ChartBar } from 'lucide-react';
import { ContextMenu } from 'periscope/components/ContextMenu';
import { useMemo } from 'react';
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
	const { groupBy } = queryData;
	const { isFetching, data } = useGetAggregateKeys(
		{
			aggregateAttribute: queryData.aggregateAttribute.key,
			dataSource: queryData.dataSource,
			aggregateOperator: queryData.aggregateOperator,
			searchText: '',
		},
		{
			queryKey: [
				queryData.aggregateAttribute.key,
				queryData.dataSource,
				queryData.aggregateOperator,
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
		<div style={{ height: '200px' }}>
			<OverlayScrollbar>
				{/* eslint-disable-next-line react/jsx-no-useless-fragment */}
				<>
					{isFetching ? (
						<OptionsSkeleton />
					) : (
						breakoutOptions?.map((item: BaseAutocompleteData) => (
							<ContextMenu.Item
								key={item.key}
								icon={<ChartBar size={16} />}
								onClick={(): void => onColumnClick(item)}
							>
								{item.key}
							</ContextMenu.Item>
						))
					)}
				</>
			</OverlayScrollbar>
		</div>
	);
}

export default BreakoutOptions;
