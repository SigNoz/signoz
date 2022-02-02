import { AutoComplete, AutoCompleteProps, Input, notification } from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

const TagsKey = (props: TagsKeysProps): JSX.Element => {
	const [selectLoading, setSelectLoading] = useState<boolean>(false);
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [selectedKey, setSelectedKey] = useState<string>(props.tag.Key[0] || '');

	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const [options, setOptions] = useState<AutoCompleteProps['options']>([]);

	const onSearchHandler = async () => {
		try {
			setSelectLoading(true);
			const response = await getTagFilters({
				start: globalTime.minTime,
				end: globalTime.maxTime,
				other: Object.fromEntries(traces.selectedFilter),
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
	};

	useEffect(() => {
		onSearchHandler();
	}, []);

	return (
		<AutoComplete
			dropdownClassName="certain-category-search-dropdown"
			dropdownMatchSelectWidth={500}
			style={{ width: 300 }}
			options={options}
			value={selectedKey}
			onChange={(value) => {
				if (options && options.find((option) => option.value === value)) {
					setSelectedKey(value);

					props.setLocalSelectedTags((tags) => [
						...tags.slice(0, props.index),
						{
							Key: [value],
							Operator: props.tag.Operator,
							Values: props.tag.Values,
						},
						...tags.slice(props.index + 1, tags.length),
					]);
				} else {
					setSelectedKey('');
				}
			}}
		>
			<Input disabled={selectLoading} placeholder="Please select" />
		</AutoComplete>
	);
};

interface TagsKeysProps {
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: React.Dispatch<
		React.SetStateAction<TraceReducer['selectedTags']>
	>;
}

export default TagsKey;
