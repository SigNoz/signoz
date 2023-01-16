import { Select } from 'antd';
import getTagValue from 'api/trace/getTagValue';
import React, { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/trace/getTagValue';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { SelectComponent } from './styles';
import { extractTagKey, extractTagType } from './utils';

function TagValue(props: TagValueProps): JSX.Element {
	const { tag, setLocalSelectedTags, index, tagKey } = props;
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		StringValues: selectedStringValues,
		NumberValues: selectedNumberValues,
		BoolValues: selectedBoolValues,
	} = tag;
	function initialLocalValue(): string | number | boolean {
		if (selectedStringValues) {
			return selectedStringValues[0];
		}
		if (selectedNumberValues) {
			return selectedNumberValues[0];
		}
		if (selectedBoolValues) {
			return selectedBoolValues[0];
		}
		return '';
	}
	const [localValue, setLocalValue] = useState<string | number | boolean>(
		initialLocalValue(),
	);

	const globalReducer = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const tagType = useMemo(() => {
		return extractTagType(tagKey);
	}, [tagKey]);

	function getOptions(
		data: SuccessResponse<PayloadProps> | ErrorResponse | undefined,
	): Array<{ label: string; value: string | number | boolean }> | undefined {
		if (tagType === 'string') {
			return data?.payload?.stringTagValues?.map((e) => ({
				label: e,
				value: e,
			}));
		}
		if (tagType === 'number') {
			return data?.payload?.numberTagValues?.map((e) => ({
				label: e.toString(),
				value: e,
			}));
		}
		if (tagType === 'bool') {
			return data?.payload?.boolTagValues?.map((e) => ({
				label: e.toString(),
				value: e,
			}));
		}
		return [];
	}

	function selectOptions(
		data: SuccessResponse<PayloadProps> | ErrorResponse | undefined,
	): string[] | boolean[] | number[] | undefined {
		if (tagType === 'string') {
			return data?.payload?.stringTagValues;
		}
		if (tagType === 'number') {
			return data?.payload?.numberTagValues;
		}
		if (tagType === 'bool') {
			return data?.payload?.boolTagValues;
		}
		return [];
	}

	const { isLoading, data } = useQuery(
		['tagKey', globalReducer.minTime, globalReducer.maxTime, tagKey, tagType],
		{
			queryFn: () =>
				getTagValue({
					end: globalReducer.maxTime,
					start: globalReducer.minTime,
					tagKey: {
						Key: extractTagKey(tagKey),
						Type: tagType,
					},
				}),
		},
	);
	return (
		<SelectComponent
			// set options to the return value of options(data) if data is not undefined
			options={getOptions(data)}
			mode="tags"
			defaultOpen
			showSearch
			filterOption={(inputValue, option): boolean =>
				option?.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
			}
			disabled={isLoading}
			value={localValue}
			onChange={(values): void => {
				if (
					typeof values === 'string' ||
					typeof values === 'number' ||
					typeof values === 'boolean'
				) {
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
							StringValues: [value],
							NumberValues: [],
							BoolValues: [],
						},
						...tags.slice(index + 1, tags.length),
					]);
				} else if (typeof value === 'number') {
					setLocalValue(value);
					setLocalSelectedTags((tags) => [
						...tags.slice(0, index),
						{
							Key: selectedKey,
							Operator: selectedOperator,
							StringValues: [],
							NumberValues: [value],
							BoolValues: [],
						},
						...tags.slice(index + 1, tags.length),
					]);
				} else if (typeof value === 'boolean') {
					setLocalValue(value);
					setLocalSelectedTags((tags) => [
						...tags.slice(0, index),
						{
							Key: selectedKey,
							Operator: selectedOperator,
							StringValues: [],
							NumberValues: [],
							BoolValues: [value],
						},
						...tags.slice(index + 1, tags.length),
					]);
				}
			}}
		>
			{selectOptions(data)?.map((suggestion) => (
				<Select.Option key={suggestion.toString()} value={suggestion}>
					{suggestion}
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
