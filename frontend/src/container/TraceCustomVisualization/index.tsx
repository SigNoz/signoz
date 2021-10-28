import { Form, Select } from 'antd';
import getSpansAggregate from 'api/trace/getSpanAggregate';
import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { PayloadProps } from 'types/api/trace/getSpanAggregate';
import { GlobalReducer } from 'types/reducer/globalTime';
const { Option } = Select;
import { AxiosError } from 'axios';
import { colors } from 'lib/getRandomColor';
import { TraceReducer } from 'types/reducer/trace';

import { aggregation_options, entity } from './config';
import {
	Card,
	CustomGraphContainer,
	CustomVisualizationsTitle,
	FormItem,
	Space,
} from './styles';

const TraceCustomVisualisation = (): JSX.Element => {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const {
		selectedKind,
		selectedOperation,
		selectedService,
		selectedTags,
		selectedLatency,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	const [selectedEntity, setSelectedEntity] = useState('calls');
	const [selectedAggOption, setSelectedAggOption] = useState('count');
	const [form] = Form.useForm();
	const [state, setState] = useState<SetState<PayloadProps | undefined>>({
		loading: true,
		payload: undefined,
		error: false,
		errorMessage: '',
	});

	const fetchData = useCallback(async () => {
		try {
			setState((state) => ({
				...state,
				loading: true,
			}));
			const response = await getSpansAggregate({
				aggregation_option: selectedAggOption,
				dimension: selectedEntity,
				end: maxTime,
				kind: selectedKind,
				maxDuration: selectedLatency.max,
				minDuration: selectedLatency.min,
				operation: selectedOperation,
				service: selectedService,
				start: minTime,
				step: '60',
				tags: JSON.stringify(selectedTags),
			});

			if (response.statusCode === 400) {
				return;
			}

			if (response.statusCode === 200) {
				setState({
					error: false,
					errorMessage: '',
					loading: false,
					payload: response.payload,
				});
			} else {
				setState({
					error: true,
					errorMessage: response.error || 'Something went wrong',
					loading: false,
					payload: undefined,
				});
			}
		} catch (error) {
			setState(() => ({
				error: true,
				errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				loading: false,
				payload: undefined,
			}));
		}
	}, [
		selectedAggOption,
		selectedEntity,
		maxTime,
		minTime,
		selectedKind,
		selectedOperation,
		selectedService,
		selectedTags,
		selectedLatency,
	]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	if (state.loading || state.payload === undefined) {
		return <Spinner tip="Loading..." size="large" height="40vh" />;
	}

	const handleFormValuesChange = (changedValues: any): void => {
		const formFieldName = Object.keys(changedValues)[0];
		if (formFieldName === 'entity') {
			const temp_entity = aggregation_options.filter(
				(item) => item.linked_entity === changedValues[formFieldName],
			)[0];

			form.setFieldsValue({
				agg_options: temp_entity.default_selected.title,
			});

			const temp = form.getFieldsValue(['agg_options', 'entity']);

			setSelectedEntity(temp.entity);
			setSelectedAggOption(temp.agg_options);
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
					agg_options: 'count',
					chart_style: 'line',
					interval: '5m',
					group_by: 'none',
				}}
			>
				<Space>
					<FormItem name="entity">
						<Select defaultValue={selectedEntity} style={{ width: 120 }} allowClear>
							{entity.map((item) => (
								<Option key={item.key} value={item.dataindex}>
									{item.title}
								</Option>
							))}
						</Select>
					</FormItem>

					<FormItem name="agg_options">
						<Select style={{ width: 120 }} allowClear>
							{aggregation_options
								.filter((item) => item.linked_entity === selectedEntity)[0]
								.options_available.map((item) => (
									<Option key={item.dataindex} value={item.dataindex}>
										{item.title}
									</Option>
								))}
						</Select>
					</FormItem>

					<FormItem name="chart_style">
						<Select style={{ width: 120 }} allowClear>
							<Option value="line">Line Chart</Option>
							<Option value="bar">Bar Chart</Option>
							<Option value="area">Area Chart</Option>
						</Select>
					</FormItem>

					<FormItem name="interval">
						<Select style={{ width: 120 }} allowClear>
							<Option value="1m">1 min</Option>
							<Option value="5m">5 min</Option>
							<Option value="30m">30 min</Option>
						</Select>
					</FormItem>

					<FormItem name="group_by">
						<Select style={{ width: 120 }} allowClear>
							<Option value="none">Group By</Option>
							<Option value="status">Status Code</Option>
							<Option value="protocol">Protocol</Option>
						</Select>
					</FormItem>
				</Space>
			</Form>

			<CustomGraphContainer>
				<Graph
					type="line"
					data={{
						labels: state.payload.map((s) => new Date(s.timestamp / 1000000)),
						datasets: [
							{
								data: state.payload.map((e) => e.value),
								borderColor: colors[0],
							},
						],
					}}
				/>
			</CustomGraphContainer>
		</Card>
	);
};

interface SetState<T> {
	loading: boolean;
	error: boolean;
	errorMessage: string;
	payload: T;
}

export default memo(TraceCustomVisualisation);
