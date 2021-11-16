import { Form, Select, Space } from 'antd';
import Graph from 'components/Graph';
import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { TraceFilters } from 'store/actions';
import { getFilteredTraceMetrics } from 'store/actions/MetricsActions';
import { customMetricsItem } from 'store/actions/MetricsActions';
import { AppState } from 'store/reducers';
const { Option } = Select;
import { colors } from 'lib/getRandomColor';
import { GlobalTime } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	Card,
	CustomGraphContainer,
	CustomVisualizationsTitle,
} from './styles';

const entity = [
	{
		title: 'Calls',
		key: 'calls',
		dataindex: 'calls',
	},
	{
		title: 'Duration',
		key: 'duration',
		dataindex: 'duration',
	},
	{
		title: 'Error',
		key: 'error',
		dataindex: 'error',
	},
	{
		title: 'Status Code',
		key: 'status_code',
		dataindex: 'status_code',
	},
];

const aggregation_options = [
	{
		linked_entity: 'calls',
		default_selected: { title: 'Count', dataindex: 'count' },
		options_available: [
			{ title: 'Count', dataindex: 'count' },
			{ title: 'Rate (per sec)', dataindex: 'rate_per_sec' },
		],
	},
	{
		linked_entity: 'duration',
		default_selected: { title: 'p99', dataindex: 'p99' },
		//   options_available: [ {title:'Avg', dataindex:'avg'}, {title:'Max', dataindex:'max'},{title:'Min', dataindex:'min'}, {title:'p50', dataindex:'p50'},{title:'p95', dataindex:'p95'}, {title:'p95', dataindex:'p95'}]
		options_available: [
			{ title: 'p50', dataindex: 'p50' },
			{ title: 'p95', dataindex: 'p95' },
			{ title: 'p99', dataindex: 'p99' },
		],
	},
	{
		linked_entity: 'error',
		default_selected: { title: 'Count', dataindex: 'count' },
		options_available: [
			{ title: 'Count', dataindex: 'count' },
			{ title: 'Rate (per sec)', dataindex: 'rate_per_sec' },
		],
	},
	{
		linked_entity: 'status_code',
		default_selected: { title: 'Count', dataindex: 'count' },
		options_available: [{ title: 'Count', dataindex: 'count' }],
	},
];

interface TraceCustomVisualizationsProps {
	filteredTraceMetrics: customMetricsItem[];
	globalTime: GlobalTime;
	getFilteredTraceMetrics: (value: string, time: GlobalTime) => void;
	traceFilters: TraceFilters;
}

const _TraceCustomVisualizations = (
	props: TraceCustomVisualizationsProps,
): JSX.Element => {
	const [selectedEntity, setSelectedEntity] = useState('calls');
	const [selectedAggOption, setSelectedAggOption] = useState('count');
	const [form] = Form.useForm();
	const selectedStep = '60';
	const {
		filteredTraceMetrics,
		getFilteredTraceMetrics,
		globalTime,
		traceFilters,
	} = props;
	const { loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// Step should be multiples of 60, 60 -> 1 min
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
		if (selectedEntity)
			request_string =
				request_string + '&dimension=' + selectedEntity.toLowerCase();
		if (selectedAggOption)
			request_string =
				request_string + '&aggregation_option=' + selectedAggOption.toLowerCase();
		if (selectedStep) request_string = request_string + '&step=' + selectedStep;
		const plusMinus15 = {
			minTime: globalTime.minTime - 15 * 60 * 1000000000,
			maxTime: globalTime.maxTime + 15 * 60 * 1000000000,
		};

		/*
			Call the apis only when the route is loaded.
			Check this issue: https://github.com/SigNoz/signoz/issues/110
		 */
		if (loading === false) {
			getFilteredTraceMetrics(request_string, plusMinus15);
		}
	}, [
		selectedEntity,
		selectedAggOption,
		traceFilters,
		getFilteredTraceMetrics,
		globalTime,
		loading,
	]);

	//Custom metrics API called if time, tracefilters, selected entity or agg option changes

	// PNOTE - Can also use 'coordinate' option in antd Select for implementing this - https://ant.design/components/select/
	const handleFormValuesChange = (changedValues: any): void => {
		const formFieldName = Object.keys(changedValues)[0];
		if (formFieldName === 'entity') {
			const temp_entity = aggregation_options.filter(
				(item) => item.linked_entity === changedValues[formFieldName],
			)[0];

			form.setFieldsValue({
				agg_options: temp_entity.default_selected.title,
				// PNOTE - TO DO Check if this has the same behaviour as selecting an option?
			});

			const temp = form.getFieldsValue(['agg_options', 'entity']);

			setSelectedEntity(temp.entity);
			setSelectedAggOption(temp.agg_options);
			//form.setFieldsValue({ agg_options: aggregation_options.filter( item => item.linked_entity === selectedEntity )[0] }); //reset product selection
			// PNOTE - https://stackoverflow.com/questions/64377293/update-select-option-list-based-on-other-select-field-selection-ant-design
		}

		if (formFieldName === 'agg_options') {
			setSelectedAggOption(changedValues[formFieldName]);
		}
	};

	return (
		<Card>
			<CustomVisualizationsTitle>Custom Visualizations</CustomVisualizationsTitle>
			<Form
				form={form}
				onValuesChange={handleFormValuesChange}
				initialValues={{
					agg_options: 'Count',
					chart_style: 'line',
					interval: '5m',
					group_by: 'none',
				}}
			>
				<Space>
					<Form.Item name="entity">
						<Select defaultValue={selectedEntity} style={{ width: 120 }} allowClear>
							{entity.map((item) => (
								<Option key={item.key} value={item.dataindex}>
									{item.title}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item name="agg_options">
						<Select style={{ width: 120 }} allowClear>
							{aggregation_options
								.filter((item) => item.linked_entity === selectedEntity)[0]
								.options_available.map((item) => (
									<Option key={item.dataindex} value={item.dataindex}>
										{item.title}
									</Option>
								))}
						</Select>
					</Form.Item>

					<Form.Item name="chart_style">
						<Select style={{ width: 120 }} allowClear>
							<Option value="line">Line Chart</Option>
							<Option value="bar">Bar Chart</Option>
							<Option value="area">Area Chart</Option>
						</Select>
					</Form.Item>

					<Form.Item name="interval">
						<Select style={{ width: 120 }} allowClear>
							<Option value="1m">1 min</Option>
							<Option value="5m">5 min</Option>
							<Option value="30m">30 min</Option>
						</Select>
					</Form.Item>

					{/* Need heading for each option */}
					<Form.Item name="group_by">
						<Select style={{ width: 120 }} allowClear>
							<Option value="none">Group By</Option>
							<Option value="status">Status Code</Option>
							<Option value="protocol">Protocol</Option>
						</Select>
					</Form.Item>
				</Space>
			</Form>

			<CustomGraphContainer>
				<Graph
					type="line"
					data={{
						labels: filteredTraceMetrics.map((s) => new Date(s.timestamp / 1000000)),
						datasets: [
							{
								data: filteredTraceMetrics.map((e) => e.value),
								borderColor: colors[0],
							},
						],
					}}
				/>
			</CustomGraphContainer>
		</Card>
	);
};

const mapStateToProps = (
	state: AppState,
): {
	filteredTraceMetrics: customMetricsItem[];
	globalTime: GlobalTime;
	traceFilters: TraceFilters;
} => {
	return {
		filteredTraceMetrics: state.metricsData.customMetricsItem,
		globalTime: state.globalTime,
		traceFilters: state.traceFilters,
	};
};

export const TraceCustomVisualizations = connect(mapStateToProps, {
	getFilteredTraceMetrics: getFilteredTraceMetrics,
})(_TraceCustomVisualizations);
