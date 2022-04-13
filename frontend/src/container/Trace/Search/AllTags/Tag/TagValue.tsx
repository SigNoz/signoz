import { Select } from 'antd';
import getTagValue from 'api/trace/getTagValue';
import React from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { SelectComponent } from './styles';

function TagValue(props: TagValueProps): JSX.Element {
	const { tag, setLocalSelectedTags, index, tagKey } = props;
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		Values: selectedValues,
	} = tag;

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
		<SelectComponent
			value={selectedValues[0]}
			onSelect={(value: unknown): void => {
				if (typeof value === 'string') {
					setLocalSelectedTags((tags) => [
						...tags.slice(0, index),
						{
							Key: selectedKey,
							Operator: selectedOperator,
							Values: [...selectedValues, value],
						},
						...tags.slice(index + 1, tags.length),
					]);
				}
			}}
			loading={isLoading || false}
		>
			{data &&
				data.payload &&
				data.payload.map((suggestion) => (
					<Select.Option key={suggestion.tagValues} value={suggestion.tagValues}>
						{suggestion.tagValues}
					</Select.Option>
				))}
		</SelectComponent>
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
