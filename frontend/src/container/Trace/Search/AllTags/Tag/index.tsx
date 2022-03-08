import React from 'react';

import { Select } from 'antd';
import {
	Container,
	IconContainer,
	SelectComponent,
	ValueSelect,
} from './styles';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import { CloseOutlined } from '@ant-design/icons';
import { SelectValue } from 'antd/lib/select';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { bindActionCreators } from 'redux';
import { UpdateSelectedTags } from 'store/actions/trace/updateTagsSelected';
import TagsKey from './TagKey';
const { Option } = Select;

type Tags = FlatArray<TraceReducer['selectedTags'], 1>['Operator'];

const AllMenu: AllMenu[] = [
	{
		key: 'in',
		value: 'IN',
	},
	{
		key: 'not in',
		value: 'NOT IN',
	},
];

interface AllMenu {
	key: Tags | '';
	value: string;
}

const SingleTags = (props: AllTagsProps): JSX.Element => {
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		Values: selectedValues,
	} = props.tag;

	const onDeleteTagHandler = (index: number) => {
		props.onCloseHandler(index);
	};

	const onChangeOperatorHandler = (key: SelectValue) => {
		props.setLocalSelectedTags([
			...traces.selectedTags.slice(0, props.index),
			{
				Key: selectedKey,
				Values: selectedValues,
				Operator: key as Tags,
			},
			...traces.selectedTags.slice(props.index + 1, traces.selectedTags.length),
		]);
	};

	return (
		<>
			<Container>
				<TagsKey
					index={props.index}
					tag={props.tag}
					setLocalSelectedTags={props.setLocalSelectedTags}
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

				<ValueSelect
					value={selectedValues}
					onChange={(value) => {
						props.setLocalSelectedTags((tags) => [
							...tags.slice(0, props.index),
							{
								Key: selectedKey,
								Operator: selectedOperator,
								Values: value as string[],
							},
							...tags.slice(props.index + 1, tags.length),
						]);
					}}
					mode="tags"
				/>

				<IconContainer
					role={'button'}
					onClick={() => onDeleteTagHandler(props.index)}
				>
					<CloseOutlined />
				</IconContainer>
			</Container>
		</>
	);
};

interface DispatchProps {
	updateSelectedTags: (props: TraceReducer['selectedTags']) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
});

interface AllTagsProps extends DispatchProps {
	onCloseHandler: (index: number) => void;
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: React.Dispatch<
		React.SetStateAction<TraceReducer['selectedTags']>
	>;
}

export default connect(null, mapDispatchToProps)(SingleTags);
