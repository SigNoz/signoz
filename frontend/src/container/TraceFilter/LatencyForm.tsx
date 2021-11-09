import { Col, Form, InputNumber, Modal, notification, Row } from 'antd';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import { FormInstance, RuleObject } from 'rc-field-form/lib/interface';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UpdateSelectedLatency } from 'store/actions/trace';
import {
	UpdateSelectedData,
	UpdateSelectedDataProps,
} from 'store/actions/trace/updateSelectedData';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

const LatencyForm = ({
	onCancel,
	visible,
	updateSelectedLatency,
	onLatencyButtonClick,
	updatedQueryParams,
	updateSelectedData,
}: LatencyModalFormProps): JSX.Element => {
	const [form] = Form.useForm();
	const [notifications, Element] = notification.useNotification();
	const {
		selectedLatency,
		selectedKind,
		selectedOperation,
		selectedService,
		selectedAggOption,
		selectedEntity,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	const validateMinValue = (form: FormInstance): RuleObject => ({
		validator(_: RuleObject, value): Promise<void> {
			const { getFieldValue } = form;
			const minValue = getFieldValue('min');
			const maxValue = getFieldValue('max');

			if (value <= maxValue && value >= minValue) {
				return Promise.resolve();
			}
			return Promise.reject(new Error('Min value should be less than Max value'));
		},
	});

	const validateMaxValue = (form: FormInstance): RuleObject => ({
		validator(_, value): Promise<void> {
			const { getFieldValue } = form;

			const minValue = getFieldValue('min');
			const maxValue = getFieldValue('max');

			if (value >= minValue && value <= maxValue) {
				return Promise.resolve();
			}
			return Promise.reject(
				new Error('Max value should be greater than Min value'),
			);
		},
	});

	const onOkHandler = (): void => {
		form
			.validateFields()
			.then((values) => {
				const maxValue = (values.max * 1000000).toString();
				const minValue = (values.min * 1000000).toString();

				onLatencyButtonClick();
				updatedQueryParams(
					[maxValue, minValue],
					[METRICS_PAGE_QUERY_PARAM.latencyMax, METRICS_PAGE_QUERY_PARAM.latencyMin],
				);
				updateSelectedLatency({
					max: maxValue,
					min: minValue,
				});
				updateSelectedData({
					selectedKind,
					selectedLatency: {
						max: maxValue,
						min: minValue,
					},
					selectedOperation,
					selectedService,
					selectedAggOption,
					selectedEntity,
				});
			})
			.catch((info) => {
				notifications.error({
					message: info.toString(),
				});
			});
	};

	return (
		<>
			{Element}

			<Modal
				title="Chose min and max values of Latency"
				okText="Apply"
				cancelText="Cancel"
				visible={visible}
				onCancel={onCancel}
				onOk={onOkHandler}
			>
				<Form
					form={form}
					layout="horizontal"
					name="form_in_modal"
					initialValues={{
						min: parseInt(selectedLatency.min, 10) / 1000000,
						max: parseInt(selectedLatency.max, 10) / 1000000,
					}}
				>
					<Row>
						<Col span={12}>
							<Form.Item name="min" label="Min (in ms)" rules={[validateMinValue]}>
								<InputNumber />
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item name="max" label="Max (in ms)" rules={[validateMaxValue]}>
								<InputNumber />
							</Form.Item>
						</Col>
					</Row>
				</Form>
			</Modal>
		</>
	);
};

interface DispatchProps {
	updateSelectedLatency: (
		selectedLatency: TraceReducer['selectedLatency'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedData: (props: UpdateSelectedDataProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedLatency: bindActionCreators(UpdateSelectedLatency, dispatch),
	updateSelectedData: bindActionCreators(UpdateSelectedData, dispatch),
});

interface LatencyModalFormProps extends DispatchProps {
	onCancel: () => void;
	visible: boolean;
	onLatencyButtonClick: () => void;
	updatedQueryParams: (updatedValue: string[], value: string[]) => void;
}

export default connect(null, mapDispatchToProps)(LatencyForm);
