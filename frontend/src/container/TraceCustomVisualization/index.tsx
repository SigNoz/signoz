import { Form, Select } from 'antd';
import Spinner from 'components/Spinner';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
const { Option } = Select;
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	GetSpanAggregate,
	SpanAggregateProps,
} from 'store/actions/trace/getSpanAggregate';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

import { aggregation_options, entity } from './config';
import { Card, CustomVisualizationsTitle, FormItem, Space } from './styles';
import TraceCustomGraph from './TraceCustomGraph';

const TraceCustomVisualisation = ({
	getSpanAggregate,
}: TraceCustomVisualisationProps): JSX.Element => {
	const {
		selectedEntity,
		spansLoading,
		selectedKind,
		selectedLatency,
		selectedOperation,
		selectedService,
		selectedTags,
		selectedAggOption,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	const [form] = Form.useForm();

	if (spansLoading) {
		return <Spinner tip="Loading..." height="40vh" />;
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

			const values = form.getFieldsValue(['agg_options', 'entity']);

			getSpanAggregate({
				selectedAggOption: values.agg_options,
				selectedEntity: values.entity,
				selectedKind,
				selectedLatency,
				selectedOperation,
				selectedService,
				selectedTags,
			});
		}

		if (formFieldName === 'agg_options') {
			getSpanAggregate({
				selectedAggOption: changedValues[formFieldName],
				selectedEntity: selectedEntity,
				selectedKind,
				selectedLatency,
				selectedOperation,
				selectedService,
				selectedTags,
			});
		}
	};

	return (
		<Card>
			<CustomVisualizationsTitle>Custom Visualizations</CustomVisualizationsTitle>
			<Form
				form={form}
				onValuesChange={handleFormValuesChange}
				initialValues={{
					agg_options: selectedAggOption,
					chart_style: 'line',
					interval: '5m',
					group_by: 'none',
				}}
			>
				<Space>
					<FormItem name="entity">
						<Select style={{ width: 120 }} allowClear>
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

			<TraceCustomGraph />
		</Card>
	);
};

interface DispatchProps {
	getSpanAggregate: (props: SpanAggregateProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getSpanAggregate: bindActionCreators(GetSpanAggregate, dispatch),
});

type TraceCustomVisualisationProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceCustomVisualisation);
