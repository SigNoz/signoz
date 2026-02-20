import { TraceReducer } from 'types/reducer/trace';

export type Tags = FlatArray<TraceReducer['selectedTags'], 1>['Operator'];

const StringBoolNumber = ['string', 'number', 'bool'];
const Number = ['number'];
const String = ['string'];
export interface AllMenuProps {
	key: Tags | '';
	value: string;
	supportedTypes: string[];
}

export const AllMenu: AllMenuProps[] = [
	{
		key: 'Equals',
		value: 'EQUALS',
		supportedTypes: StringBoolNumber,
	},
	{
		key: 'NotEquals',
		value: 'NOT EQUALS',
		supportedTypes: StringBoolNumber,
	},
	{
		key: 'In',
		value: 'IN',
		supportedTypes: String,
	},
	{
		key: 'NotIn',
		value: 'NOT IN',
		supportedTypes: String,
	},
	{
		key: 'Exists',
		value: 'EXISTS',
		supportedTypes: StringBoolNumber,
	},
	{
		key: 'NotExists',
		value: 'NOT EXISTS',
		supportedTypes: StringBoolNumber,
	},
	{
		key: 'GreaterThan',
		value: 'GREATER THAN',
		supportedTypes: Number,
	},
	{
		key: 'LessThan',
		value: 'LESS THAN',
		supportedTypes: Number,
	},
	{
		key: 'GreaterThanEquals',
		value: 'GREATER THAN OR EQUALS',
		supportedTypes: Number,
	},
	{
		key: 'LessThanEquals',
		value: 'LESS THAN OR EQUALS',
		supportedTypes: Number,
	},
	{
		key: 'StartsWith',
		value: 'STARTS WITH',
		supportedTypes: String,
	},
	{
		key: 'NotStartsWith',
		value: 'NOT STARTS WITH',
		supportedTypes: String,
	},
	{
		key: 'Contains',
		value: 'CONTAINS',
		supportedTypes: String,
	},
	{
		key: 'NotContains',
		value: 'NOT CONTAINS',
		supportedTypes: String,
	},
];
