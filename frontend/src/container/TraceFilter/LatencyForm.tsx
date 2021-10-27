import { Col, Form, InputNumber, Modal, notification, Row } from 'antd';
import { LatencyValue } from 'pages/TraceDetails';
import { FormInstance, RuleObject } from 'rc-field-form/lib/interface';
import React from 'react';

const LatencyForm = ({
	onCancel,
	visible,
	latencyFilterValues,
	setLatencyFilterValues,
}: LatencyModalFormProps): JSX.Element => {
	const [form] = Form.useForm();
	const [notifications, Element] = notification.useNotification();

	const validateMinValue = (form: FormInstance): RuleObject => ({
		validator(_: RuleObject, value): Promise<void> {
			const { getFieldValue } = form;
			const minValue = getFieldValue('min');
			const maxValue = getFieldValue('max');

			console.log({ minValue, maxValue, asd: 'minValue' });

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

			console.log({ minValue, maxValue, asd: 'maxValue' });

			if (value >= minValue && value <= maxValue) {
				return Promise.resolve();
			}
			return Promise.reject(
				new Error('Max value should be greater than Min value'),
			);
		},
	});

	return (
		<>
			{Element}

			<Modal
				title="Chose min and max values of Latency"
				okText="Apply"
				cancelText="Cancel"
				visible={visible}
				onCancel={onCancel}
				onOk={(): void => {
					form
						.validateFields()
						.then((values) => {
							form.resetFields();
							// setLatencyFilterValues({
							// 	max:values
							// })
							console.log(values);
						})
						.catch((info) => {
							notifications.error({
								message: info.toString(),
							});
						});
				}}
			>
				<Form
					form={form}
					layout="horizontal"
					name="form_in_modal"
					initialValues={latencyFilterValues}
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

interface LatencyModalFormProps {
	onCancel: () => void;
	latencyFilterValues: LatencyValue;
	visible: boolean;
	setLatencyFilterValues: React.Dispatch<React.SetStateAction<LatencyValue>>;
}

export default LatencyForm;
