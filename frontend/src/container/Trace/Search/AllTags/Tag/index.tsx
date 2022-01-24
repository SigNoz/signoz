import React, { useState } from 'react';

import { Select, notification, SelectProps, Spin } from 'antd';
import {
	Container,
	IconContainer,
	SelectComponent,
	ValueSelect,
} from './styles';
import getTagFilters from 'api/trace/getTagFilter';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import { CloseOutlined } from '@ant-design/icons';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { SelectValue } from 'antd/lib/select';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { bindActionCreators } from 'redux';
import { UpdateSelectedTags } from 'store/actions/trace/updateTagsSelected';
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
	{
		key: '',
		value: 'None',
	},
];

interface AllMenu {
	key: Tags | '';
	value: string;
}

const SingleTags = (props: AllTagsProps): JSX.Element => {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		Values: selectedValues,
	} = props.tag;

	const [selectLoading, setSelectLoading] = useState<boolean>(false);

	const [selectedOptions, setSelectedOptions] = useState<
		SelectProps<SelectValue>['options']
	>([]);

	const [
		notificationConfig,
		NotificationElement,
	] = notification.useNotification();

	const onSearchHandler = async (value: string, traces: TraceReducer) => {
		try {
			setSelectLoading(true);
			const response = await getTagFilters({
				start: globalTime.minTime,
				end: globalTime.maxTime,
				other: Object.fromEntries(traces.selectedFilter),
			});

			if (response.statusCode === 200) {
				setSelectedOptions(
					response.payload.map((e) => ({
						value: e.tagKeys,
					})),
				);
			} else {
				notificationConfig.error({
					message: response.error || 'Something went wrong',
				});
			}
			setSelectLoading(false);
		} catch (error) {
			notificationConfig.error({
				message: 'Something went wrong',
			});
			setSelectLoading(false);
		}
	};

	const onSearchDebounceFunction = useDebouncedFn(onSearchHandler, 1000);

	const onValueChangeHandler: SelectProps<SelectValue>['onChange'] = (
		value,
		options,
	) => {
		if (selectedKey.length === 0) {
			props.setLocalSelectedTags([
				...traces.selectedTags.slice(0, props.index),
				{
					Operator: selectedOperator,
					Values: selectedValues,
					Key: options.map((e: { value: string }) => e.value),
				},
				...traces.selectedTags.slice(props.index + 1, traces.selectedTags.length),
			]);
		} else {
			props.setLocalSelectedTags([
				...traces.selectedTags.slice(0, props.index),
				{
					Operator: selectedOperator,
					Values: selectedValues,
					Key: [],
				},
				...traces.selectedTags.slice(props.index + 1, traces.selectedTags.length),
			]);
		}
	};

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

	console.log({ AllMenu });

	return (
		<>
			{NotificationElement}

			<Container>
				<SelectComponent
					onSearch={(value) => {
						onSearchDebounceFunction(value, traces);
					}}
					onChange={onValueChangeHandler}
					value={selectedKey}
					placeholder="Please select"
					mode="multiple"
					options={selectedOptions}
					loading={selectLoading}
					filterOption={false}
					notFoundContent={selectLoading ? <Spin size="small" /> : null}
				/>

				<SelectComponent
					onChange={onChangeOperatorHandler}
					value={AllMenu.find((e) => e.key === selectedOperator)?.value || ''}
				>
					{AllMenu.map((e) => (
						<Option key={e.key} value={e.value}>
							{e.value}
						</Option>
					))}
				</SelectComponent>

				<ValueSelect
					value={selectedValues}
					onChange={(value) => {
						props.setLocalSelectedTags([
							...traces.selectedTags.slice(0, props.index),
							{
								Key: selectedKey,
								Operator: selectedOperator,
								Values: value as string[],
							},
							...traces.selectedTags.slice(
								props.index + 1,
								traces.selectedTags.length,
							),
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
