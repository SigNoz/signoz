import { CloseOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { TraceReducer } from 'types/reducer/trace';

import { Container, IconContainer, SelectComponent } from './styles';
import TagsKey from './TagKey';
import TagValue from './TagValue';
import { mapOperators } from './utils';

const { Option } = Select;

type Tags = FlatArray<TraceReducer['selectedTags'], 1>['Operator'];
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

function SingleTags(props: AllTagsProps): JSX.Element {
	const {
		tag,
		onCloseHandler,
		setLocalSelectedTags,
		index,
		localSelectedTags,
	} = props;
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		StringValues: selectedStringValues,
		NumberValues: selectedNumberValues,
		BoolValues: selectedBoolValues,
	} = tag;

	const onDeleteTagHandler = (index: number): void => {
		onCloseHandler(index);
	};

	const onChangeOperatorHandler = (key: unknown): void => {
		if (typeof key === 'string') {
			setLocalSelectedTags([
				...localSelectedTags.slice(0, index),
				{
					Key: selectedKey,
					StringValues: selectedStringValues,
					NumberValues: selectedNumberValues,
					BoolValues: selectedBoolValues,
					Operator: key as Tags,
				},
				...localSelectedTags.slice(index + 1, localSelectedTags.length),
			]);
		}
	};

	return (
		<Container>
			<TagsKey
				index={index}
				tag={tag}
				setLocalSelectedTags={setLocalSelectedTags}
			/>
			<SelectComponent
				onChange={onChangeOperatorHandler}
				value={AllMenu.find((e) => e.key === selectedOperator)?.value || ''}
			>
				{
					// filter out the operator that does not include supported type of the selected key
					mapOperators(selectedKey).map((e) => (
						<Option key={e.value} value={e.key}>
							{e.value}
						</Option>
					))
				}
			</SelectComponent>

			{selectedKey ? (
				<TagValue
					index={index}
					tag={tag}
					setLocalSelectedTags={setLocalSelectedTags}
					tagKey={selectedKey}
				/>
			) : (
				<SelectComponent />
			)}

			<IconContainer role="button" onClick={(): void => onDeleteTagHandler(index)}>
				<CloseOutlined />
			</IconContainer>
		</Container>
	);
}

interface AllTagsProps {
	onCloseHandler: (index: number) => void;
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: Dispatch<SetStateAction<TraceReducer['selectedTags']>>;
	localSelectedTags: TraceReducer['selectedTags'];
}

export interface Value {
	key: string;
	label: string;
	value: string;
}

export default SingleTags;
