import { Dispatch, SetStateAction } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { TraceReducer } from 'types/reducer/trace';

import { AllMenu, Tags } from './constants';
import { Container, IconContainer, SelectComponent } from './styles';
import TagsKey from './TagKey';
import TagValue from './TagValue';
import { mapOperators } from './utils';

const { Option } = Select;

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
