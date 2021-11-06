import { Form, Select } from 'antd';
import Spinner from 'components/Spinner';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
const { Option } = Select;
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

import { aggregation_options, entity } from './config';
import { Card, CustomVisualizationsTitle, FormItem, Space } from './styles';
import TraceCustomGraph from './TraceCustomGraph';
import {
	GetTraceVisualAggregates,
	GetTraceVisualAggregatesProps,
} from 'store/actions/trace/getTraceVisualAgrregates';

const TraceCustomVisualisation = ({
	getTraceVisualAggregates,
}: TraceCustomVisualisationProps): JSX.Element => {
	const {
		selectedEntity,
		spansLoading,
		selectedAggOption,
		spansAggregate,
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

			getTraceVisualAggregates({
				selectedAggOption: values.agg_options,
				selectedEntity: values.entity,
			});
		}

		if (formFieldName === 'agg_options') {
			getTraceVisualAggregates({
				selectedAggOption: changedValues[formFieldName],
				selectedEntity,
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
					entity: selectedEntity,
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
				</Space>
			</Form>

			<TraceCustomGraph
				{...{
					spansAggregate,
				}}
			/>
		</Card>
	);
};

interface DispatchProps {
	getTraceVisualAggregates: (props: GetTraceVisualAggregatesProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getTraceVisualAggregates: bindActionCreators(
		GetTraceVisualAggregates,
		dispatch,
	),
});

type TraceCustomVisualisationProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceCustomVisualisation);
