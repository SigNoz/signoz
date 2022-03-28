import { CloseOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { fetchTag, TagValue } from './config';
import DebounceSelect from './DebounceSelect';
import { Container, IconContainer, SelectComponent } from './styles';
import TagsKey from './TagKey';

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
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);
	const globalReducer = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { tag, onCloseHandler, setLocalSelectedTags, index } = props;
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
				...traces.selectedTags.slice(0, index),
				{
					Key: selectedKey,
					Values: selectedValues,
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
				{AllMenu.map((e) => (
					<Option key={e.value} value={e.key}>
						{e.value}
					</Option>
				))}
			</SelectComponent>

			<DebounceSelect
				fetchOptions={(): Promise<TagValue[]> =>
					fetchTag(globalReducer.minTime, globalReducer.maxTime, selectedKey[0])
				}
				debounceTimeout={300}
				mode="tags"
			/>

			{/* <ValueSelect
				value={selectedValues}
				onChange={(value): void => {
					setLocalSelectedTags((tags) => [
						...tags.slice(0, index),
						{
							Key: selectedKey,
							Operator: selectedOperator,
							Values: value as string[],
						},
						...tags.slice(index + 1, tags.length),
					]);
				}}
				mode="tags"
			/> */}

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

export default SingleTags;
