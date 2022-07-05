import { AutoComplete, AutoCompleteProps, Input, notification } from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

function TagsKey(props: TagsKeysProps): JSX.Element {
	const [selectLoading, setSelectLoading] = useState<boolean>(false);
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { index, setLocalSelectedTags, tag } = props;

	const [selectedKey, setSelectedKey] = useState<string>(tag.Key[0] || '');

	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const [options, setOptions] = useState<AutoCompleteProps['options']>([]);

	const onSearchHandler = useCallback(async () => {
		try {
			setSelectLoading(true);
			const response = await getTagFilters({
				start: globalTime.minTime,
				end: globalTime.maxTime,
				other: Object.fromEntries(traces.selectedFilter),
				isFilterExclude: traces.isFilterExclude,
			});

			if (response.statusCode === 200) {
				if (response.payload === null) {
					setOptions([
						{
							value: '',
							label: 'No tags available',
						},
					]);
				} else {
					setOptions(
						response.payload.map((e) => ({
							value: e.tagKeys,
							label: e.tagKeys,
						})),
					);
				}
			} else {
				notification.error({
					message: response.error || 'Something went wrong',
				});
			}
			setSelectLoading(false);
		} catch (error) {
			notification.error({
				message: 'Something went wrong',
			});
			setSelectLoading(false);
		}
	}, [globalTime, traces]);

	const counter = useRef(0);

	useEffect(() => {
		if (counter.current === 0 && selectedKey.length === 0) {
			counter.current = 1;
			onSearchHandler();
		}
	}, [onSearchHandler, selectedKey.length]);

	return (
		<AutoComplete
			dropdownClassName="certain-category-search-dropdown"
			dropdownMatchSelectWidth={500}
			style={{ width: '100%' }}
			value={selectedKey}
			allowClear
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
				if (
					typeof value === 'string' &&
					options &&
					options.find((option) => option.value === value)
				) {
					setSelectedKey(value);

					setLocalSelectedTags((tags) => [
						...tags.slice(0, index),
						{
							Key: [value],
							Operator: tag.Operator,
							Values: tag.Values,
						},
						...tags.slice(index + 1, tags.length),
					]);
				}
			}}
		>
			<Input disabled={selectLoading} placeholder="Please select" />
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
