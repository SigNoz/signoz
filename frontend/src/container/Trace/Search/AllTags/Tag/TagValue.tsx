import { Select } from 'antd';
import { BaseOptionType } from 'antd/es/select';
import getTagValue from 'api/trace/getTagValue';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { SelectComponent } from './styles';
import {
	disableTagValue,
	extractTagKey,
	extractTagType,
	getInitialLocalValue,
	getTagValueOptions,
	onTagValueChange,
	selectOptions,
	TagValueTypes,
} from './utils';

function TagValue(props: TagValueProps): JSX.Element {
	const { tag, setLocalSelectedTags, index, tagKey } = props;
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		StringValues: selectedStringValues,
		NumberValues: selectedNumberValues,
		BoolValues: selectedBoolValues,
	} = tag;

	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const [localTagValue, setLocalTagValue] = useState<TagValueTypes[]>(
		getInitialLocalValue(
			selectedNumberValues,
			selectedBoolValues,
			selectedStringValues,
		),
	);

	const globalReducer = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const tagType = useMemo(() => extractTagType(tagKey), [tagKey]);

	const { isLoading, data } = useQuery(
		[
			'tagKey',
			globalReducer.minTime,
			globalReducer.maxTime,
			tagKey,
			tagType,
			traces.spanKind,
		],
		{
			queryFn: () =>
				getTagValue({
					end: globalReducer.maxTime,
					start: globalReducer.minTime,
					tagKey: {
						Key: extractTagKey(tagKey),
						Type: tagType,
					},
					spanKind: traces.spanKind,
				}),
		},
	);

	const tagValueDisabled = useMemo(
		() =>
			disableTagValue(
				selectedOperator,
				setLocalTagValue,
				selectedKey,
				setLocalSelectedTags,
				index,
			),
		[index, selectedKey, selectedOperator, setLocalSelectedTags],
	);

	const onSetLocalValue = useCallback(() => {
		setLocalTagValue([]);
	}, []);

	const onDeselectValue = useCallback(
		(value: unknown) => {
			const values = localTagValue;
			for (let i = 0; i < values.length; i += 1) {
				if (values[i] === value) {
					values.splice(i, 1);
				}
			}
			setLocalTagValue(values);
		},
		[localTagValue],
	);

	const onSelectedHandler = useCallback(
		(value: unknown) => {
			if (
				typeof value === 'number' ||
				(typeof value === 'string' && !Number.isNaN(Number(value)) && value !== ' ')
			) {
				const values = localTagValue;
				values.push(value);
				setLocalTagValue(values);
				const numberValues: number[] = [];
				values.forEach((element) => {
					numberValues.push(Number(element));
				});
				setLocalSelectedTags((tags) => [
					...tags.slice(0, index),
					{
						Key: selectedKey,
						Operator: selectedOperator,
						StringValues: [],
						NumberValues: numberValues,
						BoolValues: [],
					},
					...tags.slice(index + 1, tags.length),
				]);
			} else if (
				typeof value === 'boolean' ||
				value === 'true' ||
				value === 'false'
			) {
				const values = localTagValue;
				values.push(value);
				setLocalTagValue(values);
				let booleanValues: boolean[];
				values.forEach((element) => {
					booleanValues.push(Boolean(element));
				});
				setLocalSelectedTags((tags) => [
					...tags.slice(0, index),
					{
						Key: selectedKey,
						Operator: selectedOperator,
						StringValues: [],
						NumberValues: [],
						BoolValues: booleanValues,
					},
					...tags.slice(index + 1, tags.length),
				]);
			} else if (typeof value === 'string') {
				const values = localTagValue;
				values.push(value);
				setLocalTagValue(values);
				let stringValues: string[];
				values.forEach((element) => {
					stringValues.push(String(element));
				});
				setLocalSelectedTags((tags) => [
					...tags.slice(0, index),
					{
						Key: selectedKey,
						Operator: selectedOperator,
						StringValues: stringValues,
						NumberValues: [],
						BoolValues: [],
					},
					...tags.slice(index + 1, tags.length),
				]);
			}
		},
		[index, localTagValue, selectedKey, selectedOperator, setLocalSelectedTags],
	);

	const onChangeHandler = useCallback(
		(value: unknown) => onTagValueChange(value, setLocalTagValue),
		[setLocalTagValue],
	);

	const getFilterOptions = useCallback(
		(inputValue: string, option?: BaseOptionType): boolean => {
			if (typeof option?.label === 'string') {
				return option?.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1;
			}
			return false;
		},
		[],
	);

	return (
		<SelectComponent
			loading={isLoading}
			options={getTagValueOptions(data?.payload, tagType)}
			mode="tags"
			allowClear
			onClear={onSetLocalValue}
			onDeselect={(value: unknown): void => onDeselectValue(value)}
			showSearch
			filterOption={getFilterOptions}
			disabled={isLoading || tagValueDisabled}
			value={localTagValue}
			onChange={onChangeHandler}
			onSelect={onSelectedHandler}
		>
			{selectOptions(data?.payload, tagType)?.map((suggestion) => (
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
