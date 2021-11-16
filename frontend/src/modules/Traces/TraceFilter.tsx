import { AutoComplete, Button, Form, Input, Select, Typography } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import { Store } from 'antd/lib/form/interface';
import api from 'api';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { fetchTraces, TraceFilters, updateTraceFilters } from 'store/actions';
import { AppState } from 'store/reducers';
import styled from 'styled-components';
import { GlobalTime } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

import { FilterStateDisplay } from './FilterStateDisplay';
import LatencyModalForm from './LatencyModalForm';

const { Option } = Select;

const InfoWrapper = styled.div`
	padding-top: 10px;
	font-style: italic;
	font-size: 12px;
`;

interface TraceFilterProps {
	traceFilters: TraceFilters;
	globalTime: GlobalTime;
	updateTraceFilters: (props: TraceFilters) => void;
	fetchTraces: (globalTime: GlobalTime, filter_params: string) => void;
}

interface TagKeyOptionItem {
	tagKeys: string;
	tagCount: number;
}

interface ISpanKind {
	label: 'SERVER' | 'CLIENT';
	value: string;
}

const _TraceFilter = (props: TraceFilterProps): JSX.Element => {
	const [serviceList, setServiceList] = useState<string[]>([]);
	const [operationList, setOperationsList] = useState<string[]>([]);
	const [tagKeyOptions, setTagKeyOptions] = useState<TagKeyOptionItem[]>([]);
	const location = useLocation();
	const urlParams = useMemo(() => {
		return new URLSearchParams(location.search.split('?')[1]);
	}, [location.search]);

	const { loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { updateTraceFilters, traceFilters, globalTime, fetchTraces } = props;
	const [modalVisible, setModalVisible] = useState(false);

	const [latencyFilterValues, setLatencyFilterValues] = useState<{
		min: string;
		max: string;
	}>({
		min: '100',
		max: '500',
	});

	const [form] = Form.useForm();

	const [form_basefilter] = Form.useForm();

	const handleChangeOperation = useCallback(
		(value: string) => {
			updateTraceFilters({ ...traceFilters, operation: value });
		},
		[traceFilters, updateTraceFilters],
	);

	const populateData = useCallback(
		(value: string) => {
			if (loading === false) {
				const service_request = '/service/' + value + '/operations';
				api.get<string[]>(service_request).then((response) => {
					// form_basefilter.resetFields(['operation',])
					setOperationsList(response.data);
				});

				const tagkeyoptions_request = '/tags?service=' + value;
				api.get<TagKeyOptionItem[]>(tagkeyoptions_request).then((response) => {
					setTagKeyOptions(response.data);
				});
			}
		},
		[loading],
	);

	const handleChangeService = useCallback(
		(value: string) => {
			populateData(value);
			updateTraceFilters({ ...traceFilters, service: value });
		},
		[traceFilters, updateTraceFilters, populateData],
	);

	const spanKindList: ISpanKind[] = [
		{
			label: 'SERVER',
			value: '2',
		},
		{
			label: 'CLIENT',
			value: '3',
		},
	];

	const handleApplyFilterForm = useCallback(
		(values: any): void => {
			updateTraceFilters({
				service: values.service,
				operation: values.operation,
				latency: {
					max: '',
					min: '',
				},
				kind: values.kind,
			});
		},
		[updateTraceFilters],
	);

	useEffect(() => {
		handleApplyFilterForm({
			service: '',
			tags: [],
			operation: '',
			latency: { min: '', max: '' },
			kind: '',
		});
	}, [handleApplyFilterForm]);

	const onTagFormSubmit = useCallback(
		(values) => {
			if (traceFilters.tags) {
				// If there are existing tag filters present
				updateTraceFilters({
					service: traceFilters.service,
					operation: traceFilters.operation,
					latency: traceFilters.latency,
					tags: [
						...traceFilters.tags,
						{
							key: values.tag_key,
							value: values.tag_value,
							operator: values.operator,
						},
					],
					kind: traceFilters.kind,
				});
			} else {
				updateTraceFilters({
					service: traceFilters.service,
					operation: traceFilters.operation,
					latency: traceFilters.latency,
					tags: [
						{
							key: values.tag_key,
							value: values.tag_value,
							operator: values.operator,
						},
					],
					kind: traceFilters.kind,
				});
			}

			form.resetFields();
		},
		[form, traceFilters, updateTraceFilters],
	);

	const counter = useRef(0);

	useEffect(() => {
		if (loading === false && counter.current === 0) {
			counter.current = 1;
			api
				.get<string[]>(`/services/list`)
				.then((response) => {
					setServiceList(response.data);
				})
				.then(() => {
					const operationName = urlParams.get(METRICS_PAGE_QUERY_PARAM.operation);
					const serviceName = urlParams.get(METRICS_PAGE_QUERY_PARAM.service);
					const errorTag = urlParams.get(METRICS_PAGE_QUERY_PARAM.error);
					if (operationName && serviceName) {
						updateTraceFilters({
							...traceFilters,
							operation: operationName,
							service: serviceName,
							kind: '',
						});
						populateData(serviceName);
					} else if (serviceName && errorTag) {
						updateTraceFilters({
							...traceFilters,
							service: serviceName,
							tags: [
								{
									key: METRICS_PAGE_QUERY_PARAM.error,
									value: errorTag,
									operator: 'equals',
								},
							],
							kind: '',
						});
					} else {
						if (operationName) {
							handleChangeOperation(operationName);
						}
						if (serviceName) {
							handleChangeService(serviceName);
						}
						if (errorTag) {
							onTagFormSubmit({
								tag_key: METRICS_PAGE_QUERY_PARAM.error,
								tag_value: errorTag,
								operator: 'equals',
							});
						}
					}
				});
		}
	}, [
		handleChangeOperation,
		onTagFormSubmit,
		handleChangeService,
		traceFilters,
		urlParams,
		updateTraceFilters,
		populateData,
		loading,
	]);

	useEffect(() => {
		let request_string =
			'service=' +
			traceFilters.service +
			'&operation=' +
			traceFilters.operation +
			'&maxDuration=' +
			traceFilters.latency?.max +
			'&minDuration=' +
			traceFilters.latency?.min +
			'&kind=' +
			traceFilters.kind;
		if (traceFilters.tags)
			request_string =
				request_string +
				'&tags=' +
				encodeURIComponent(JSON.stringify(traceFilters.tags));

		if (loading === false) {
			fetchTraces(globalTime, request_string);
		}
	}, [traceFilters, fetchTraces, loading, globalTime]);

	useEffect(() => {
		let latencyButtonText = 'Latency';
		if (traceFilters.latency?.min === '' && traceFilters.latency?.max !== '')
			latencyButtonText =
				'Latency<' +
				(parseInt(traceFilters.latency?.max) / 1000000).toString() +
				'ms';
		else if (traceFilters.latency?.min !== '' && traceFilters.latency?.max === '')
			latencyButtonText =
				'Latency>' +
				(parseInt(traceFilters.latency?.min) / 1000000).toString() +
				'ms';
		else if (
			traceFilters.latency !== undefined &&
			traceFilters.latency?.min !== '' &&
			traceFilters.latency?.max !== ''
		)
			latencyButtonText =
				(parseInt(traceFilters.latency.min) / 1000000).toString() +
				'ms <Latency<' +
				(parseInt(traceFilters.latency.max) / 1000000).toString() +
				'ms';

		form_basefilter.setFieldsValue({ latency: latencyButtonText });
		form_basefilter.setFieldsValue({ service: traceFilters.service });
		form_basefilter.setFieldsValue({ operation: traceFilters.operation });
		form_basefilter.setFieldsValue({ kind: traceFilters.kind });
	}, [traceFilters, form_basefilter]);

	const onLatencyButtonClick = (): void => {
		setModalVisible(true);
	};

	const onLatencyModalApply = (values: Store): void => {
		setModalVisible(false);
		const { min, max } = values;
		updateTraceFilters({
			...traceFilters,
			latency: {
				min: min ? (parseInt(min) * 1000000).toString() : '',
				max: max ? (parseInt(max) * 1000000).toString() : '',
			},
		});

		setLatencyFilterValues({ min, max });
	};

	// For autocomplete
	//Setting value when autocomplete field is changed
	const onChangeTagKey = (data: string): void => {
		form.setFieldsValue({ tag_key: data });
	};

	const dataSource = ['status:200'];
	const children = [];
	for (let i = 0; i < dataSource.length; i++) {
		children.push(
			<Option value={dataSource[i]} key={dataSource[i]}>
				{dataSource[i]}
			</Option>,
		);
	}

	useEffect(() => {
		return (): void => {
			updateTraceFilters({
				service: '',
				operation: '',
				tags: [],
				latency: { min: '', max: '' },
				kind: '',
			});
		};
	}, [updateTraceFilters]);

	const handleChangeSpanKind = (value = ''): void => {
		updateTraceFilters({ ...traceFilters, kind: value });
	};

	return (
		<div>
			<Typography>Filter Traces</Typography>
			<Form
				form={form_basefilter}
				layout="inline"
				onFinish={handleApplyFilterForm}
				initialValues={{ service: '', operation: '', latency: 'Latency' }}
				style={{ marginTop: 10, marginBottom: 10 }}
			>
				<FormItem rules={[{ required: true }]} name="service">
					<Select
						showSearch
						style={{ width: 180 }}
						onChange={handleChangeService}
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
						style={{ width: 180 }}
						onChange={handleChangeOperation}
						placeholder="Select Operation"
						allowClear
					>
						{operationList.map((item) => (
							<Option key={item} value={item}>
								{item}
							</Option>
						))}
					</Select>
				</FormItem>

				<FormItem name="latency">
					<Input
						style={{ width: 200 }}
						type="button"
						onClick={onLatencyButtonClick}
					/>
				</FormItem>

				<FormItem name="spanKind">
					<Select
						showSearch
						style={{ width: 180 }}
						onChange={handleChangeSpanKind}
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

			<FilterStateDisplay />

			<InfoWrapper>Select Service to get Tag suggestions </InfoWrapper>

			<Form
				form={form}
				layout="inline"
				onFinish={onTagFormSubmit}
				initialValues={{ operator: 'equals' }}
				style={{ marginTop: 10, marginBottom: 10 }}
			>
				<FormItem rules={[{ required: true }]} name="tag_key">
					<AutoComplete
						options={tagKeyOptions.map((s) => {
							return { value: s.tagKeys };
						})}
						style={{ width: 200, textAlign: 'center' }}
						onChange={onChangeTagKey}
						filterOption={(inputValue, option): boolean =>
							option?.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
						}
						placeholder="Tag Key"
					/>
				</FormItem>

				<FormItem name="operator">
					<Select style={{ width: 120, textAlign: 'center' }}>
						<Option value="equals">EQUAL</Option>
						<Option value="contains">CONTAINS</Option>
						<Option value="regex">REGEX</Option>
					</Select>
				</FormItem>

				<FormItem rules={[{ required: true }]} name="tag_value">
					<Input
						style={{ width: 160, textAlign: 'center' }}
						placeholder="Tag Value"
					/>
				</FormItem>

				<FormItem>
					<Button type="primary" htmlType="submit">
						{' '}
						Apply Tag Filter{' '}
					</Button>
				</FormItem>
			</Form>

			{modalVisible && (
				<LatencyModalForm
					onCreate={onLatencyModalApply}
					latencyFilterValues={latencyFilterValues}
					onCancel={(): void => {
						setModalVisible(false);
					}}
				/>
			)}
		</div>
	);
};

const mapStateToProps = (
	state: AppState,
): { traceFilters: TraceFilters; globalTime: GlobalTime } => {
	return { traceFilters: state.traceFilters, globalTime: state.globalTime };
};

export const TraceFilter = connect(mapStateToProps, {
	updateTraceFilters: updateTraceFilters,
	fetchTraces: fetchTraces,
})(_TraceFilter);
