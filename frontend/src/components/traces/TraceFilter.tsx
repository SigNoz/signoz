import React, { useEffect, useState } from "react";
import { Select, Button, Input, Form, AutoComplete } from "antd";
import { connect } from "react-redux";
import { Store } from "antd/lib/form/interface";
import styled from "styled-components";

import {
	updateTraceFilters,
	fetchTraces,
	TraceFilters,
	GlobalTime,
} from "../../actions";
import { StoreState } from "../../reducers";
import LatencyModalForm from "./LatencyModalForm";
import { FilterStateDisplay } from "./FilterStateDisplay";

import FormItem from "antd/lib/form/FormItem";
import metricsAPI from "../../api/metricsAPI";
import { useLocation } from "react-router-dom";
import { METRICS_PAGE_QUERY_PARAM } from "Src/constants/query";

const { Option } = Select;

const InfoWrapper = styled.div`
	padding-top: 10px;
	font-style: italic;
	font-size: 12px;
`;

interface TraceFilterProps {
	traceFilters: TraceFilters;
	globalTime: GlobalTime;
	updateTraceFilters: Function;
	fetchTraces: Function;
}

interface TagKeyOptionItem {
	tagKeys: string;
	tagCount: number;
}

const _TraceFilter = (props: TraceFilterProps) => {
	const [serviceList, setServiceList] = useState<string[]>([]);
	const [operationList, setOperationsList] = useState<string[]>([]);
	const [tagKeyOptions, setTagKeyOptions] = useState<TagKeyOptionItem[]>([]);
	const location = useLocation();
	const urlParams = new URLSearchParams(location.search.split("?")[1]);

	useEffect(() => {
		handleApplyFilterForm({
			service: "",
			tags: [],
			operation: "",
			latency: { min: "", max: "" },
		});
	}, []);

	useEffect(() => {
		metricsAPI
			.get<string[]>("services/list")
			.then((response) => {
				setServiceList(response.data);
			})
			.then(() => {
				const serviceName = urlParams.get(METRICS_PAGE_QUERY_PARAM.service);
				if (serviceName) {
					handleChangeService(serviceName);
				}
			});
	}, []);

	useEffect(() => {
		let request_string =
			"service=" +
			props.traceFilters.service +
			"&operation=" +
			props.traceFilters.operation +
			"&maxDuration=" +
			props.traceFilters.latency?.max +
			"&minDuration=" +
			props.traceFilters.latency?.min;
		if (props.traceFilters.tags)
			request_string =
				request_string +
				"&tags=" +
				encodeURIComponent(JSON.stringify(props.traceFilters.tags));

		props.fetchTraces(props.globalTime, request_string);
	}, [props.traceFilters, props.globalTime]);

	useEffect(() => {
		let latencyButtonText = "Latency";
		if (
			props.traceFilters.latency?.min === "" &&
			props.traceFilters.latency?.max !== ""
		)
			latencyButtonText =
				"Latency<" +
				(parseInt(props.traceFilters.latency?.max) / 1000000).toString() +
				"ms";
		else if (
			props.traceFilters.latency?.min !== "" &&
			props.traceFilters.latency?.max === ""
		)
			latencyButtonText =
				"Latency>" +
				(parseInt(props.traceFilters.latency?.min) / 1000000).toString() +
				"ms";
		else if (
			props.traceFilters.latency !== undefined &&
			props.traceFilters.latency?.min !== "" &&
			props.traceFilters.latency?.max !== ""
		)
			latencyButtonText =
				(parseInt(props.traceFilters.latency.min) / 1000000).toString() +
				"ms <Latency<" +
				(parseInt(props.traceFilters.latency.max) / 1000000).toString() +
				"ms";

		form_basefilter.setFieldsValue({ latency: latencyButtonText });
	}, [props.traceFilters.latency]);

	useEffect(() => {
		form_basefilter.setFieldsValue({ service: props.traceFilters.service });
	}, [props.traceFilters.service]);

	useEffect(() => {
		form_basefilter.setFieldsValue({ operation: props.traceFilters.operation });
	}, [props.traceFilters.operation]);

	const [modalVisible, setModalVisible] = useState(false);
	const [loading] = useState(false);

	const [tagKeyValueApplied, setTagKeyValueApplied] = useState([""]);
	const [latencyFilterValues, setLatencyFilterValues] = useState<{
		min: string;
		max: string;
	}>({
		min: "100",
		max: "500",
	});

	const [form] = Form.useForm();

	const [form_basefilter] = Form.useForm();

	function handleChange(value: string) {
		console.log(value);
	}

	function handleChangeOperation(value: string) {
		props.updateTraceFilters({ ...props.traceFilters, operation: value });
	}

	function handleChangeService(value: string) {
		let service_request = "/service/" + value + "/operations";
		metricsAPI.get<string[]>(service_request).then((response) => {
			// form_basefilter.resetFields(['operation',])
			setOperationsList(response.data);
		});

		let tagkeyoptions_request = "tags?service=" + value;
		metricsAPI.get<TagKeyOptionItem[]>(tagkeyoptions_request).then((response) => {
			setTagKeyOptions(response.data);
		});

		props.updateTraceFilters({ ...props.traceFilters, service: value });
	}

	const onLatencyButtonClick = () => {
		setModalVisible(true);
	};

	const onLatencyModalApply = (values: Store) => {
		setModalVisible(false);
		const { min, max } = values;
		props.updateTraceFilters({
			...props.traceFilters,
			latency: {
				min: min ? (parseInt(min) * 1000000).toString() : "",
				max: max ? (parseInt(max) * 1000000).toString() : "",
			},
		});

		setLatencyFilterValues({ min, max });
	};

	const onTagFormSubmit = (values: any) => {
		let request_tags =
			"service=frontend&tags=" +
			encodeURIComponent(
				JSON.stringify([
					{
						key: values.tag_key,
						value: values.tag_value,
						operator: values.operator,
					},
				]),
			);

		if (props.traceFilters.tags) {
			// If there are existing tag filters present
			props.updateTraceFilters({
				service: props.traceFilters.service,
				operation: props.traceFilters.operation,
				latency: props.traceFilters.latency,
				tags: [
					...props.traceFilters.tags,
					{
						key: values.tag_key,
						value: values.tag_value,
						operator: values.operator,
					},
				],
			});
		} else {
			props.updateTraceFilters({
				service: props.traceFilters.service,
				operation: props.traceFilters.operation,
				latency: props.traceFilters.latency,
				tags: [
					{
						key: values.tag_key,
						value: values.tag_value,
						operator: values.operator,
					},
				],
			});
		}

		form.resetFields();
	};

	// For autocomplete
	//Setting value when autocomplete field is changed
	const onChangeTagKey = (data: string) => {
		form.setFieldsValue({ tag_key: data });
	};

	const dataSource = ["status:200"];
	const children = [];
	for (let i = 0; i < dataSource.length; i++) {
		children.push(
			<Option value={dataSource[i]} key={dataSource[i]}>
				{dataSource[i]}
			</Option>,
		);
	}

	// PNOTE - Remove any
	const handleApplyFilterForm = (values: any) => {
		let request_params: string = "";
		if (
			typeof values.service !== undefined &&
			typeof values.operation !== undefined
		) {
			request_params =
				"service=" + values.service + "&operation=" + values.operation;
		} else if (
			typeof values.service === undefined &&
			typeof values.operation !== undefined
		) {
			request_params = "operation=" + values.operation;
		} else if (
			typeof values.service !== undefined &&
			typeof values.operation === undefined
		) {
			request_params = "service=" + values.service;
		}

		request_params =
			request_params +
			"&minDuration=" +
			latencyFilterValues.min +
			"&maxDuration=" +
			latencyFilterValues.max;

		setTagKeyValueApplied((tagKeyValueApplied) => [
			...tagKeyValueApplied,
			"service eq" + values.service,
			"operation eq " + values.operation,
			"maxduration eq " + (parseInt(latencyFilterValues.max) / 1000000).toString(),
			"minduration eq " + (parseInt(latencyFilterValues.min) / 1000000).toString(),
		]);
		props.updateTraceFilters({
			service: values.service,
			operation: values.operation,
			latency: {
				max: "",
				min: "",
			},
		});
	};

	useEffect(() => {
		return () => {
			props.updateTraceFilters({
				service: "",
				operation: "",
				tags: [],
				latency: { min: "", max: "" },
			});
		};
	}, []);

	return (
		<div>
			<div>Filter Traces</div>
			{/* <div>{JSON.stringify(props.traceFilters)}</div> */}

			<Form
				form={form_basefilter}
				layout="inline"
				onFinish={handleApplyFilterForm}
				initialValues={{ service: "", operation: "", latency: "Latency" }}
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
							<Option value={s}>{s}</Option>
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
							<Option value={item}>{item}</Option>
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

				{/* <FormItem>
                    <Button type="primary" htmlType="submit">Apply Filters</Button>
                </FormItem> */}
			</Form>

			<FilterStateDisplay />

			{/* // What will be the empty state of card when there is no Tag , it should show something */}

			<InfoWrapper>Select Service to get Tag suggestions </InfoWrapper>

			<Form
				form={form}
				layout="inline"
				onFinish={onTagFormSubmit}
				initialValues={{ operator: "equals" }}
				style={{ marginTop: 10, marginBottom: 10 }}
			>
				<FormItem rules={[{ required: true }]} name="tag_key">
					<AutoComplete
						options={tagKeyOptions.map((s) => {
							return { value: s.tagKeys };
						})}
						style={{ width: 200, textAlign: "center" }}
						// onSelect={onSelect}
						// onSearch={onSearch}
						onChange={onChangeTagKey}
						filterOption={(inputValue, option) =>
							option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
						}
						placeholder="Tag Key"
					/>
				</FormItem>

				<FormItem name="operator">
					<Select style={{ width: 120, textAlign: "center" }}>
						<Option value="equals">EQUAL</Option>
						<Option value="contains">CONTAINS</Option>
					</Select>
				</FormItem>

				<FormItem rules={[{ required: true }]} name="tag_value">
					<Input
						style={{ width: 160, textAlign: "center" }}
						placeholder="Tag Value"
					/>
				</FormItem>

				<FormItem>
					<Button type="primary" htmlType="submit">
						{" "}
						Apply Tag Filter{" "}
					</Button>
				</FormItem>
			</Form>

			{modalVisible && (
				<LatencyModalForm
					onCreate={onLatencyModalApply}
					latencyFilterValues={latencyFilterValues}
					onCancel={() => {
						setModalVisible(false);
					}}
				/>
			)}
		</div>
	);
};

const mapStateToProps = (
	state: StoreState,
): { traceFilters: TraceFilters; globalTime: GlobalTime } => {
	return { traceFilters: state.traceFilters, globalTime: state.globalTime };
};

export const TraceFilter = connect(mapStateToProps, {
	updateTraceFilters: updateTraceFilters,
	fetchTraces: fetchTraces,
})(_TraceFilter);
