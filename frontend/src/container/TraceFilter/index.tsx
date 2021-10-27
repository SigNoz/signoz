import { Button, Form, Input, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
const FormItem = Form.Item;
import { SelectValue } from 'antd/lib/select';
import {
	InitialRequestPayload,
	LatencyValue,
	TagItem,
} from 'pages/TraceDetails';

import { spanKindList } from './config';
import Filter from './Filter';
import LatencyForm from './LatencyForm';
import { AutoComplete, InfoWrapper, Select } from './styles';
const { Option } = Select;

const TraceList = ({
	setSelectedKind,
	setSelectedOperation,
	setSelectedService,
	serviceList,
	tags = [],
	serviceOperation = [],
	fetchData,
	latencyFilterValues,
	setLatencyFilterValues,
	selectedOperation,
	selectedService,
	selectedTags,
	setSelectedTags,
}: TraceListProps): JSX.Element => {
	const [visible, setVisible] = useState<boolean>(false);
	const [form] = Form.useForm();
	const [form_basefilter] = Form.useForm();

	const onLatencyButtonClick = useCallback(() => {
		setVisible((visible) => !visible);
	}, []);

	const onChangeHandler = useCallback(
		(value: string, setFunc: React.Dispatch<React.SetStateAction<string>>) => {
			setFunc(value);
		},
		[],
	);

	const onApplyFilterFormHandler = (): void => {
		fetchData();
	};

	const onTagSubmitTagHandler = (values: Item): void => {
		setSelectedTags((value) => [
			...value,
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
				onFinish={onApplyFilterFormHandler}
				initialValues={{ service: '', operation: '', latency: 'Latency' }}
			>
				<FormItem rules={[{ required: true }]} name="service">
					<Select
						showSearch
						onChange={(value: SelectValue): void =>
							onChangeHandler(value?.toString() || '', setSelectedService)
						}
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
						onChange={(value: SelectValue): void =>
							onChangeHandler(value?.toString() || '', setSelectedOperation)
						}
						placeholder="Select Operation"
						allowClear
					>
						{serviceOperation.map((item) => (
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
							onChangeHandler(value?.toString() || '', setSelectedKind);
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

			<Filter
				{...{
					tags: selectedTags,
					latency: latencyFilterValues,
					operation: selectedOperation,
					service: selectedService,
				}}
			/>

			<InfoWrapper>Select Service to get Tag suggestions</InfoWrapper>

			<Form
				form={form}
				layout="inline"
				onFinish={onTagSubmitTagHandler}
				initialValues={{ operator: 'equals' }}
			>
				<FormItem rules={[{ required: true }]} name="tag_key">
					<AutoComplete
						options={tags.map((s) => {
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
				latencyFilterValues={latencyFilterValues}
				onCancel={(): void => {
					setVisible(false);
				}}
				visible={visible}
				setLatencyFilterValues={setLatencyFilterValues}
			/>
		</>
	);
};

interface TraceListProps {
	setSelectedKind: React.Dispatch<React.SetStateAction<string>>;
	setSelectedOperation: React.Dispatch<React.SetStateAction<string>>;
	setSelectedService: React.Dispatch<React.SetStateAction<string>>;
	serviceList: InitialRequestPayload['serviceList'];
	tags: InitialRequestPayload['tags'];
	serviceOperation: InitialRequestPayload['operations'];
	fetchData: () => Promise<void>;
	latencyFilterValues: LatencyValue;
	setLatencyFilterValues: React.Dispatch<React.SetStateAction<LatencyValue>>;

	selectedOperation: string;
	selectedService: string;
	selectedTags: TagItem[];
	setSelectedTags: React.Dispatch<React.SetStateAction<TagItem[]>>;
}

interface Item {
	tag_key: string;
	tag_value: string;
	operator: TagItem['operator'];
}

export default TraceList;
