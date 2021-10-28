import { Button, Input, Typography } from 'antd';
import { SelectValue } from 'antd/lib/select';
import React, { useCallback, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TagItem, TraceReducer } from 'types/reducer/trace';

import { spanKindList } from './config';
import Filter from './Filter';
import LatencyForm from './LatencyForm';
import { AutoComplete, Form, InfoWrapper, Select } from './styles';
const { Option } = Select;
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	UpdateSelectedKind,
	UpdateSelectedOperation,
	UpdateSelectedService,
	UpdateSelectedTags,
} from 'store/actions/trace';
import AppActions from 'types/actions';

const FormItem = Form.Item;
const TraceList = ({
	updateSelectedKind,
	updateSelectedOperation,
	updateSelectedService,
	updateSelectedTags,
}: TraceListProps): JSX.Element => {
	const [visible, setVisible] = useState<boolean>(false);
	const [form] = Form.useForm();
	const [form_basefilter] = Form.useForm();

	const onLatencyButtonClick = useCallback(() => {
		setVisible((visible) => !visible);
	}, []);

	const {
		operationsList,
		serviceList,
		tagsSuggestions,
		selectedTags,
		selectedService,
		selectedOperation,
		selectedLatency,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	const onTagSubmitTagHandler = (values: Item): void => {
		updateSelectedTags([
			...selectedTags,
			{
				operator: values.operator,
				key: values.tag_key,
				value: values.tag_value,
			},
		]);
	};

	const onChangeTagKey = (data: string): void => {
		form.setFieldsValue({ tag_key: data });
	};

	return (
		<>
			<Typography>Filter Traces</Typography>
			<Form
				form={form_basefilter}
				layout="inline"
				initialValues={{ service: '', operation: '', latency: 'Latency' }}
			>
				<FormItem rules={[{ required: true }]} name="service">
					<Select
						showSearch
						onChange={(value: SelectValue): void => {
							updateSelectedService(value?.toString() || '');
						}}
						placeholder="Select Service"
						allowClear
					>
						{serviceList.map((s) => (
							<Option key={s} value={s}>
								{s}
							</Option>
						))}
					</Select>
				</FormItem>

				<FormItem name="operation">
					<Select
						showSearch
						onChange={(value: SelectValue): void => {
							updateSelectedOperation(value?.toString() || '');
						}}
						placeholder="Select Operation"
						allowClear
					>
						{operationsList.map((item) => (
							<Option key={item} value={item}>
								{item}
							</Option>
						))}
					</Select>
				</FormItem>

				<FormItem name="latency">
					<Input type="button" onClick={onLatencyButtonClick} />
				</FormItem>

				<FormItem name="spanKind">
					<Select
						showSearch
						onChange={(value: SelectValue): void => {
							if (value) {
								updateSelectedKind(value.toString());
							}
						}}
						placeholder="Select Span Kind"
						allowClear
					>
						{spanKindList.map((spanKind) => (
							<Option value={spanKind.value} key={spanKind.value}>
								{spanKind.label}
							</Option>
						))}
					</Select>
				</FormItem>
			</Form>

			{(selectedTags.length !== 0 ||
				selectedService.length !== 0 ||
				selectedOperation.length !== 0 ||
				selectedLatency.max.length !== 0 ||
				selectedLatency.min.length !== 0) && <Filter />}

			<InfoWrapper>Select Service to get Tag suggestions</InfoWrapper>
			<Form
				form={form}
				layout="inline"
				onFinish={onTagSubmitTagHandler}
				initialValues={{ operator: 'equals' }}
			>
				<FormItem rules={[{ required: true }]} name="tag_key">
					<AutoComplete
						options={tagsSuggestions.map((s) => {
							return { value: s.tagKeys };
						})}
						onChange={onChangeTagKey}
						filterOption={(inputValue, option): boolean =>
							option?.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
						}
						placeholder="Tag Key"
					/>
				</FormItem>

				<FormItem name="operator">
					<Select>
						<Option value="equals">EQUAL</Option>
						<Option value="contains">CONTAINS</Option>
						<Option value="regex">REGEX</Option>
					</Select>
				</FormItem>

				<FormItem rules={[{ required: true }]} name="tag_value">
					<Input placeholder="Tag Value" />
				</FormItem>

				<FormItem>
					<Button type="primary" htmlType="submit">
						Apply Tag Filter
					</Button>
				</FormItem>
			</Form>
			<LatencyForm
				onCancel={(): void => {
					setVisible(false);
				}}
				visible={visible}
				onLatencyButtonClick={onLatencyButtonClick}
			/>
		</>
	);
};

interface Item {
	tag_key: string;
	tag_value: string;
	operator: TagItem['operator'];
}

interface DispatchProps {
	updateSelectedKind: (
		selectedKind: TraceReducer['selectedKind'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedOperation: (
		selectedOperation: TraceReducer['selectedOperation'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedService: (
		selectedService: TraceReducer['selectedService'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedTags: (
		selectedTags: TraceReducer['selectedTags'],
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedKind: bindActionCreators(UpdateSelectedKind, dispatch),
	updateSelectedOperation: bindActionCreators(UpdateSelectedOperation, dispatch),
	updateSelectedService: bindActionCreators(UpdateSelectedService, dispatch),
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
});

type TraceListProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceList);
