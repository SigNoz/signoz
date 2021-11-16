import { Button, Input, Typography, notification } from 'antd';
import { SelectValue } from 'antd/lib/select';
import React, { useCallback, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TagItem, TraceReducer } from 'types/reducer/trace';

import { spanKindList } from './config';
import Filter from './Filter';
import LatencyForm from './LatencyForm';
import { AutoComplete, Form, InfoWrapper, Select } from './styles';
const { Option } = Select;
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { useLocation } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UpdateSelectedTags } from 'store/actions/trace';
import {
	UpdateSelectedData,
	UpdateSelectedDataProps,
} from 'store/actions/trace/updateSelectedData';
import AppActions from 'types/actions';

const FormItem = Form.Item;

const TraceList = ({
	updateSelectedTags,
	updateSelectedData,
}: TraceListProps): JSX.Element => {
	const [
		notificationInstance,
		NotificationElement,
	] = notification.useNotification();

	const [visible, setVisible] = useState<boolean>(false);
	const [form] = Form.useForm();
	const [form_basefilter] = Form.useForm();

	const { search } = useLocation();

	const params = new URLSearchParams(search);

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
		selectedKind,
		selectedAggOption,
		selectedEntity,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	const paramsInObject = (params: URLSearchParams): { [x: string]: string } => {
		const updatedParamas: { [x: string]: string } = {};
		params.forEach((value, key) => {
			updatedParamas[key] = value;
		});
		return updatedParamas;
	};

	const updatedQueryParams = (updatedValue: string[], key: string[]): void => {
		const updatedParams = paramsInObject(params);

		updatedValue.forEach((_, index) => {
			updatedParams[key[index]] = updatedValue[index];
		});

		const queryParams = createQueryParams(updatedParams);
		history.push(ROUTES.TRACE + `?${queryParams}`);
	};

	const getUpdatedSelectedData = (props: UpdateSelectedDataProps): void => {
		const {
			selectedKind,
			selectedLatency,
			selectedOperation,
			selectedService,
		} = props;

		updateSelectedData({
			selectedKind,
			selectedLatency,
			selectedOperation,
			selectedService,
			selectedAggOption,
			selectedEntity,
		});
	};

	const onTagSubmitTagHandler = (values: Item): void => {
		if (values.tag_key.length === 0 || values.tag_value.length === 0) {
			return;
		}

		// check whether it is pre-existing in the array or not

		const isFound = selectedTags.find((tags) => {
			return (
				tags.key === values.tag_key &&
				tags.value === values.tag_value &&
				tags.operator === values.operator
			);
		});

		if (!isFound) {
			const preSelectedTags = [
				...selectedTags,
				{
					operator: values.operator,
					key: values.tag_key,
					value: values.tag_value,
				},
			];

			updatedQueryParams(
				[JSON.stringify(preSelectedTags)],
				[METRICS_PAGE_QUERY_PARAM.selectedTags],
			);

			updateSelectedTags(preSelectedTags);
		} else {
			notificationInstance.error({
				message: 'Tag Already Present',
			});
		}
	};

	const onChangeTagKey = (data: string): void => {
		form.setFieldsValue({ tag_key: data });
	};

	const updateSelectedServiceHandler = (value: string): void => {
		updatedQueryParams([value], [METRICS_PAGE_QUERY_PARAM.service]);
		getUpdatedSelectedData({
			selectedKind,
			selectedLatency,
			selectedOperation,
			selectedService: value,
			selectedAggOption,
			selectedEntity,
		});
	};

	const updateSelectedOperationHandler = (value: string): void => {
		updatedQueryParams([value], [METRICS_PAGE_QUERY_PARAM.operation]);
		getUpdatedSelectedData({
			selectedKind,
			selectedLatency,
			selectedOperation: value,
			selectedService,
			selectedAggOption,
			selectedEntity,
		});
	};

	const updateSelectedKindHandler = (value: string): void => {
		updatedQueryParams([value], [METRICS_PAGE_QUERY_PARAM.kind]);
		getUpdatedSelectedData({
			selectedKind: value,
			selectedLatency,
			selectedOperation,
			selectedService,
			selectedAggOption,
			selectedEntity,
		});
	};

	useEffect(() => {
		if (selectedService.length !== 0) {
			form_basefilter.setFieldsValue({
				service: selectedService,
			});
		} else {
			form_basefilter.setFieldsValue({
				service: '',
			});
		}

		if (selectedOperation.length !== 0) {
			form_basefilter.setFieldsValue({
				operation: selectedOperation,
			});
		} else {
			form_basefilter.setFieldsValue({
				operation: '',
			});
		}

		if (selectedKind.length !== 0) {
			form_basefilter.setFieldsValue({
				spanKind: selectedKind,
			});
		} else {
			form_basefilter.setFieldsValue({
				spanKind: '',
			});
		}

		if (selectedLatency.max.length === 0 && selectedLatency.min.length === 0) {
			form_basefilter.setFieldsValue({
				latency: 'Latency',
			});
		}

		if (selectedLatency.max.length !== 0 && selectedLatency.min.length === 0) {
			form_basefilter.setFieldsValue({
				latency: `Latency < Max Latency: ${
					parseInt(selectedLatency.max, 10) / 1000000
				} ms`,
			});
		}

		if (selectedLatency.max.length === 0 && selectedLatency.min.length !== 0) {
			form_basefilter.setFieldsValue({
				latency: `Min Latency: ${
					parseInt(selectedLatency.min, 10) / 1000000
				} ms < Latency`,
			});
		}

		if (selectedLatency.max.length !== 0 && selectedLatency.min.length !== 0) {
			form_basefilter.setFieldsValue({
				latency: `Min Latency: ${
					parseInt(selectedLatency.min, 10) / 1000000
				} ms < Latency < Max Latency: ${
					parseInt(selectedLatency.min, 10) / 1000000
				} ms`,
			});
		}
	}, [selectedService, selectedOperation, selectedKind, selectedLatency]);

	return (
		<>
			{NotificationElement}

			<Typography>Filter Traces</Typography>
			<Form form={form_basefilter} layout="inline">
				<FormItem name="service">
					<Select
						showSearch
						onChange={(value: SelectValue): void => {
							updateSelectedServiceHandler(value?.toString() || '');
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
							updateSelectedOperationHandler(value?.toString() || '');
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
							updateSelectedKindHandler(value?.toString() || '');
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
				selectedLatency.min.length !== 0) && (
				<Filter updatedQueryParams={updatedQueryParams} />
			)}

			<InfoWrapper>Select Service to get Tag suggestions</InfoWrapper>
			<Form
				form={form}
				layout="inline"
				onFinish={onTagSubmitTagHandler}
				initialValues={{ operator: 'equals' }}
			>
				<FormItem name="tag_key">
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

				<FormItem name="tag_value">
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
				updatedQueryParams={updatedQueryParams}
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
	updateSelectedTags: (
		selectedTags: TraceReducer['selectedTags'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedData: (props: UpdateSelectedDataProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
	updateSelectedData: bindActionCreators(UpdateSelectedData, dispatch),
});

type TraceListProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceList);
