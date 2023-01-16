import { CloseOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';

import { Container, IconContainer, SelectComponent } from './styles';
import TagsKey from './TagKey';
import TagValue from './TagValue';
import { extractTagType } from './utils';

const { Option } = Select;

type Tags = FlatArray<TraceReducer['selectedTags'], 1>['Operator'];

interface AllMenuProps {
	key: Tags | '';
	value: string;
	supportedTypes: string[];
}

const AllMenu: AllMenuProps[] = [
	{
		key: 'In',
		value: 'IN',
		supportedTypes: ['string'],
	},
	{
		key: 'NotIn',
		value: 'NOT IN',
		supportedTypes: ['string'],
	},
	{
		key: 'Equals',
		value: 'EQUALS',
		supportedTypes: ['string', 'number', 'boolean'],
	},
	{
		key: 'NotEquals',
		value: 'NOT EQUALS',
		supportedTypes: ['string', 'number', 'boolean'],
	},
	{
		key: 'Exists',
		value: 'EXISTS',
		supportedTypes: ['string', 'number', 'boolean'],
	},
	{
		key: 'NotExists',
		value: 'NOT EXISTS',
		supportedTypes: ['string', 'number', 'boolean'],
	},
	{
		key: 'GreaterThan',
		value: 'GREATER THAN',
		supportedTypes: ['number'],
	},
	{
		key: 'LessThan',
		value: 'LESS THAN',
		supportedTypes: ['number'],
	},
	{
		key: 'GreaterThanEquals',
		value: 'GREATER THAN OR EQUALS',
		supportedTypes: ['number'],
	},
	{
		key: 'LessThanEquals',
		value: 'LESS THAN OR EQUALS',
		supportedTypes: ['number'],
	},
	{
		key: 'StartsWith',
		value: 'STARTS WITH',
		supportedTypes: ['string'],
	},
	{
		key: 'NotStartsWith',
		value: 'NOT STARTS WITH',
		supportedTypes: ['string'],
	},
	{
		key: 'Contains',
		value: 'CONTAINS',
		supportedTypes: ['string'],
	},
	{
		key: 'NotContains',
		value: 'NOT CONTAINS',
		supportedTypes: ['string'],
	},
];

function SingleTags(props: AllTagsProps): JSX.Element {
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { tag, onCloseHandler, setLocalSelectedTags, index } = props;
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
				...traces.selectedTags.slice(0, index),
				{
					Key: selectedKey,
					StringValues: selectedStringValues,
					NumberValues: selectedNumberValues,
					BoolValues: selectedBoolValues,
					Operator: key as Tags,
				},
				...traces.selectedTags.slice(index + 1, traces.selectedTags.length),
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
					AllMenu.filter((e) =>
						e?.supportedTypes?.includes(extractTagType(selectedKey[0])),
					).map((e) => (
						<Option key={e.value} value={e.key}>
							{e.value}
						</Option>
					))
				}
			</SelectComponent>

			{selectedKey[0] ? (
				<TagValue
					index={index}
					tag={tag}
					setLocalSelectedTags={setLocalSelectedTags}
					tagKey={selectedKey[0]}
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
	setLocalSelectedTags: React.Dispatch<
		React.SetStateAction<TraceReducer['selectedTags']>
	>;
}

export interface Value {
	key: string;
	label: string;
	value: string;
}

export default SingleTags;
