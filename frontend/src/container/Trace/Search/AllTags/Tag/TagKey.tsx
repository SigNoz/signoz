import { AutoComplete, Input } from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { getTagKeyOptions, onTagKeySelect } from './utils';

function TagsKey(props: TagsKeysProps): JSX.Element {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { index, setLocalSelectedTags, tag } = props;

	const [selectedKey, setSelectedKey] = useState<string>(tag.Key || '');

	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { isLoading, data } = useQuery(
		[
			'getTagKeys',
			globalTime.minTime,
			globalTime.maxTime,
			traces.selectedFilter,
			traces.isFilterExclude,
			traces.spanKind,
		],
		{
			queryFn: () =>
				getTagFilters({
					start: globalTime.minTime,
					end: globalTime.maxTime,
					other: Object.fromEntries(traces.selectedFilter),
					isFilterExclude: traces.isFilterExclude,
					spanKind: traces.spanKind,
				}),
			cacheTime: 120000,
		},
	);

	const options = useMemo(() => getTagKeyOptions(data?.payload), [data]);

	const onSelectHandler = useCallback(
		(value: unknown) =>
			onTagKeySelect(
				value,
				options,
				setSelectedKey,
				setLocalSelectedTags,
				index,
				tag,
			),
		[index, options, setLocalSelectedTags, tag],
	);

	return (
		<AutoComplete
			style={{ width: '100%' }}
			value={selectedKey}
			allowClear
			disabled={isLoading}
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
			onSelect={onSelectHandler}
		>
			<Input placeholder="Please select" />
		</AutoComplete>
	);
}

interface TagsKeysProps {
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: Dispatch<SetStateAction<TraceReducer['selectedTags']>>;
}

export default TagsKey;
