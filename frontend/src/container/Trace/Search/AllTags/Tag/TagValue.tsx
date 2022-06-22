import { Select } from 'antd';
import getTagValue from 'api/trace/getTagValue';
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { AutoCompleteComponent } from './styles';

function TagValue(props: TagValueProps): JSX.Element {
	const { tag, setLocalSelectedTags, index, tagKey } = props;
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		Values: selectedValues,
	} = tag;
	const [localValue, setLocalValue] = useState<string>(selectedValues[0]);

	const globalReducer = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { isLoading, data } = useQuery(
		['tagKey', globalReducer.minTime, globalReducer.maxTime, tagKey],
		{
			queryFn: () =>
				getTagValue({
					end: globalReducer.maxTime,
					start: globalReducer.minTime,
					tagKey,
				}),
		},
	);

	return (
		<AutoCompleteComponent
			options={data?.payload?.map((e) => ({
				label: e.tagValues,
				value: e.tagValues,
			}))}
			allowClear
			defaultOpen
			showSearch
			filterOption={(inputValue, option): boolean =>
				option?.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
			}
			disabled={isLoading}
			value={localValue}
			onChange={(values): void => {
				if (typeof values === 'string') {
					setLocalValue(values);
				}
			}}
			onSelect={(value: unknown): void => {
				if (typeof value === 'string') {
					setLocalValue(value);
					setLocalSelectedTags((tags) => [
						...tags.slice(0, index),
						{
							Key: selectedKey,
							Operator: selectedOperator,
							Values: [value],
						},
						...tags.slice(index + 1, tags.length),
					]);
				}
			}}
		>
			{data &&
				data.payload &&
				data.payload.map((suggestion) => (
					<Select.Option key={suggestion.tagValues} value={suggestion.tagValues}>
						{suggestion.tagValues}
					</Select.Option>
				))}
		</AutoCompleteComponent>
	);
}

interface TagValueProps {
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: React.Dispatch<
		React.SetStateAction<TraceReducer['selectedTags']>
	>;
	tagKey: string;
}

export default TagValue;
