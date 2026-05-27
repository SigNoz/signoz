import {
	Dispatch,
	SetStateAction,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import getTagFilters from 'api/trace/getTagFilter';
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

	const { data } = useQuery(
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

	const comboboxItems: ComboboxSimpleItem[] = useMemo(
		() =>
			options?.map((e) => ({
				label: e.label?.toString() ?? '',
				value: e.value as string,
			})) ?? [],
		[options],
	);

	const handleChange = useCallback(
		(value: string | string[]): void => {
			const stringValue = value as string;
			setSelectedKey(stringValue);
			onTagKeySelect(
				stringValue,
				options,
				setSelectedKey,
				setLocalSelectedTags,
				index,
				tag,
			);
		},
		[index, options, setLocalSelectedTags, tag],
	);

	return (
		<ComboboxSimple
			style={{ width: '100%' }}
			value={selectedKey}
			items={comboboxItems}
			emptyPlaceholder="No tags available"
			placeholder="Please select"
			onChange={handleChange}
		/>
	);
}

interface TagsKeysProps {
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: Dispatch<SetStateAction<TraceReducer['selectedTags']>>;
}

export default TagsKey;
