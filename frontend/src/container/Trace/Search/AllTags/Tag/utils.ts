import { AutoCompleteProps } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { Dispatch, SetStateAction } from 'react';
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

export function onTagValueChange(values: unknown): TagValueTypes[] {
	const stringValues = values as string[];

	if (!Array.isArray(stringValues) || stringValues.length === 0) {
		return [];
	}

	return values as TagValueTypes[];
}

export function separateTagValues(
	values: TagValueTypes[],
	selectedKey: string,
): { boolValues: boolean[]; numberValues: number[]; stringValues: string[] } {
	if (selectedKey.includes('.(bool)')) {
		const boolValues = values.filter(
			(value) => typeof value === 'boolean',
		) as boolean[];

		return {
			boolValues,
			numberValues: [],
			stringValues: [],
		};
	}

	if (selectedKey.includes('.(number)')) {
		const numberValues = values
			.filter((value) => typeof value === 'number' || !Number.isNaN(Number(value)))
			.map((value) => Number(value)) as number[];
		return {
			boolValues: [],
			numberValues,
			stringValues: [],
		};
	}

	const stringValues = values.filter(
		(value) =>
			typeof value === 'string' &&
			value !== 'true' &&
			value !== 'false' &&
			Number.isNaN(Number(value)),
	) as string[];

	return {
		boolValues: [],
		numberValues: [],
		stringValues,
	};
}

export function disableTagValue(
	selectedOperator: OperatorValues,
	setLocalValue: Dispatch<SetStateAction<TagValueTypes[]>>,
	selectedKeys: string,
	setLocalSelectedTags: Dispatch<SetStateAction<Tags[]>>,
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
	return [
		...selectedBoolValues,
		...selectedNumberValues,
		...selectedStringValues,
	];
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

export function mapOperators(selectedKey: string): AllMenuProps[] {
	return AllMenu.filter((e) =>
		e?.supportedTypes?.includes(extractTagType(selectedKey)),
	);
}

export function onTagKeySelect(
	value: unknown,
	options: AutoCompleteProps['options'],
	setSelectedKey: Dispatch<SetStateAction<string>>,
	setLocalSelectedTags: Dispatch<SetStateAction<Tags[]>>,
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
				Key: value,
				Operator: tag.Operator,
				StringValues: tag.StringValues,
				NumberValues: tag.NumberValues,
				BoolValues: tag.BoolValues,
			},
			...tags.slice(index + 1, tags.length),
		]);
	}
}
