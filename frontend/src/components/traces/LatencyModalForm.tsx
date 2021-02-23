import React from "react";
import { Modal, Form, InputNumber, Col, Row } from "antd";
import { Store } from "antd/lib/form/interface";

interface LatencyModalFormProps {
	onCreate: (values: Store) => void; //Store is defined in antd forms library
	onCancel: () => void;
	latencyFilterValues: { min: string; max: string };
}

const LatencyModalForm: React.FC<LatencyModalFormProps> = ({
	onCreate,
	onCancel,
	latencyFilterValues,
}) => {
	const [form] = Form.useForm();
	return (
		<Modal
			visible={true}
			title="Chose min and max values of Latency"
			okText="Apply"
			cancelText="Cancel"
			onCancel={onCancel}
			onOk={() => {
				form
					.validateFields()
					.then((values) => {
						form.resetFields();
						onCreate(values); // giving error for values
					})
					.catch((info) => {
						console.log("Validate Failed:", info);
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
					{/* <Input.Group compact> */}
					<Col span={12}>
						<Form.Item
							name="min"
							label="Min (in ms)"
							//   rules={[{ required: true, message: 'Please input the title of collection!' }]}
						>
							<InputNumber />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item name="max" label="Max (in ms)">
							<InputNumber />
						</Form.Item>
					</Col>
				</Row>
				{/* </Input.Group> */}
			</Form>
		</Modal>
	);
};

export default LatencyModalForm;
