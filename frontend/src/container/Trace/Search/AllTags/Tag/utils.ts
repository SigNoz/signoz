import { AutoCompleteProps } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { PayloadProps as TagKeyPayload } from 'types/api/trace/getTagFilters';
import { PayloadProps as TagValuePayload } from 'types/api/trace/getTagValue';
import { OperatorValues, Tags } from 'types/reducer/trace';

import { AllMenu, AllMenuProps } from '.';

export type TagValueTypes = string | number | boolean;
/**
 * @description extract tag filters from payload
 */
export const extractTagFilters = (
	payload: TagKeyPayload,
): DefaultOptionType[] => {
	const tagFilters: string[] = [];
	payload.stringTagKeys.forEach((element) => {
		tagFilters.push(`${element}.(string)`);
	});
	payload.numberTagKeys.forEach((element) => {
		tagFilters.push(`${element}.(number)`);
	});
	payload.boolTagKeys.forEach((element) => {
		tagFilters.push(`${element}.(bool)`);
	});
	return tagFilters.map((e) => ({
		value: e,
		label: e,
	}));
};

export const extractTagType = (tagKey: string): string => {
	if (tagKey?.includes('.(string)')) {
		return 'string';
	}
	if (tagKey?.includes('.(number)')) {
		return 'number';
	}
	if (tagKey?.includes('.(bool)')) {
		return 'bool';
	}
	return 'string';
};

export const extractTagKey = (tagKey: string): string => {
	const tag = tagKey.split('.(');
	if (tag && tag.length > 0) {
		return tag[0];
	}
	return '';
};

export function onTagValueChange(
	values: unknown,
	setLocalValue: React.Dispatch<React.SetStateAction<TagValueTypes[]>>,
): void {
	if (Array.isArray(values) && values.length > 0) {
		if (typeof values[0] === 'number' || typeof values[0] === 'boolean') {
			setLocalValue(values);
		} else if (typeof values[0] === 'string') {
			if (values[0] === 'true' || values[0] === 'false') {
				setLocalValue([values[0] === 'true']);
			} else if (values[0] !== ' ' && !Number.isNaN(Number(values[0]))) {
				setLocalValue([Number(values[0])]);
			} else {
				setLocalValue([values[0]]);
			}
		}
	}
}

export function disableTagValue(
	selectedOperator: OperatorValues,
	setLocalValue: React.Dispatch<React.SetStateAction<TagValueTypes[]>>,
	selectedKeys: string[],
	setLocalSelectedTags: React.Dispatch<React.SetStateAction<Tags[]>>,
	index: number,
): boolean {
	if (selectedOperator === 'Exists' || selectedOperator === 'NotExists') {
		setLocalValue([]);
		setLocalSelectedTags((tags) => [
			...tags.slice(0, index),
			{
				Key: selectedKeys,
				Operator: selectedOperator,
				StringValues: [],
				NumberValues: [],
				BoolValues: [],
			},
			...tags.slice(index + 1, tags.length),
		]);
		return true;
	}
	return false;
}

export function getInitialLocalValue(
	selectedNumberValues: number[],
	selectedBoolValues: boolean[],
	selectedStringValues: string[],
): TagValueTypes[] {
	if (selectedStringValues && selectedStringValues.length > 0) {
		return selectedStringValues;
	}
	if (selectedNumberValues && selectedNumberValues.length > 0) {
		return selectedNumberValues;
	}
	if (selectedBoolValues && selectedBoolValues.length > 0) {
		return selectedBoolValues;
	}
	return selectedStringValues;
}

export function getTagValueOptions(
	payload: TagValuePayload | null | undefined,
	tagType: string,
): Array<{ label: string; value: TagValueTypes }> | undefined {
	if (tagType === 'string') {
		return payload?.stringTagValues?.map((e) => ({
			label: e,
			value: e,
		}));
	}
	if (tagType === 'number') {
		return payload?.numberTagValues?.map((e) => ({
			label: e.toString(),
			value: e,
		}));
	}
	if (tagType === 'bool') {
		return payload?.boolTagValues?.map((e) => ({
			label: e.toString(),
			value: e,
		}));
	}
	return [];
}

export function getTagKeyOptions(
	payload: TagKeyPayload | null | undefined,
): DefaultOptionType[] {
	if (payload === null) {
		return [
			{
				value: '',
				label: 'No tags available',
			},
		];
	}
	if (payload != null) {
		return extractTagFilters(payload);
	}
	return [];
}

export function selectOptions(
	payload: TagValuePayload | null | undefined,
	tagType: string,
): string[] | boolean[] | number[] | undefined {
	if (tagType === 'string') {
		return payload?.stringTagValues;
	}
	if (tagType === 'number') {
		return payload?.numberTagValues;
	}
	if (tagType === 'bool') {
		return payload?.boolTagValues;
	}
	return [];
}

export function mapOperators(selectedKey: string[]): AllMenuProps[] {
	return AllMenu.filter((e) =>
		e?.supportedTypes?.includes(extractTagType(selectedKey[0])),
	);
}

export function onTagKeySelect(
	value: unknown,
	options: AutoCompleteProps['options'],
	setSelectedKey: React.Dispatch<React.SetStateAction<string>>,
	setLocalSelectedTags: React.Dispatch<React.SetStateAction<Tags[]>>,
	index: number,
	tag: Tags,
): void {
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
				StringValues: tag.StringValues,
				NumberValues: tag.NumberValues,
				BoolValues: tag.BoolValues,
			},
			...tags.slice(index + 1, tags.length),
		]);
	}
}
