import { CloseOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import React from 'react';
import { TraceReducer } from 'types/reducer/trace';

import { Container, IconContainer, SelectComponent } from './styles';
import TagsKey from './TagKey';
import TagValue from './TagValue';

const { Option } = Select;

type Tags = FlatArray<TraceReducer['selectedTags'], 1>['Operator'];

interface AllMenuProps {
	key: Tags | '';
	value: string;
}

const AllMenu: AllMenuProps[] = [
	{
		key: 'in',
		value: 'IN',
	},
	{
		key: 'not in',
		value: 'NOT IN',
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
		Values: selectedValues,
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
					Values: selectedValues,
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
				{AllMenu.map((e) => (
					<Option key={e.value} value={e.key}>
						{e.value}
					</Option>
				))}
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
	localSelectedTags: TraceReducer['selectedTags'];
}

export interface Value {
	key: string;
	label: string;
	value: string;
}

export default SingleTags;
