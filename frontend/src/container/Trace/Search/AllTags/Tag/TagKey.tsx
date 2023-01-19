import { AutoComplete, Input } from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import React, { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { getTagKeyOptions, newFunction } from './utils';

function TagsKey(props: TagsKeysProps): JSX.Element {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { index, setLocalSelectedTags, tag } = props;

	const [selectedKey, setSelectedKey] = useState<string>(tag.Key[0] || '');

	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { isLoading, data } = useQuery(
		['getTagKeys', globalTime.minTime, globalTime.maxTime, traces],
		{
			queryFn: () =>
				getTagFilters({
					start: globalTime.minTime,
					end: globalTime.maxTime,
					other: Object.fromEntries(traces.selectedFilter),
					isFilterExclude: traces.isFilterExclude,
				}),
		},
	);

	const options = useMemo(() => getTagKeyOptions(data?.payload), [data]);

	return (
		<AutoComplete
			style={{ width: '100%' }}
			value={selectedKey}
			allowClear
			notFoundContent="No tags available"
			showSearch
			options={options?.map((e) => ({
				label: e.label?.toString(),
				value: e.value,
			}))}
			filterOption={(inputValue, option): boolean =>
				option?.label?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
			}
			onChange={(e): void => setSelectedKey(e)}
			onSelect={(value: unknown): void => {
				newFunction(
					value,
					options,
					setSelectedKey,
					setLocalSelectedTags,
					index,
					tag,
				);
			}}
		>
			<Input disabled={isLoading} placeholder="Please select" />
		</AutoComplete>
	);
}

interface TagsKeysProps {
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: React.Dispatch<
		React.SetStateAction<TraceReducer['selectedTags']>
	>;
}

export default TagsKey;
