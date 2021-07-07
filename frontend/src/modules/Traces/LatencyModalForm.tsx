import React from 'react';
import { Modal, Form, InputNumber, Col, Row } from 'antd';
import { NamePath, Store } from 'antd/lib/form/interface';

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
    
	const validateMinValue = ({ getFieldValue }: {getFieldValue: (name: NamePath) => any}) => ({
		validator(_, value: any) {
		  if (value < getFieldValue('max')) {
				return Promise.resolve();
		  }
		  return Promise.reject(new Error('Min value should be less than Max value'));
		},
	  });

	const validateMaxValue = ({ getFieldValue }: {getFieldValue: (name: NamePath) => any}) => ({
		validator(_, value: any) {
		  if (value > getFieldValue('min')) {
				return Promise.resolve();
		  }
		  return Promise.reject(new Error('Max value should be greater than Min value'));
		},
	  });
      
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
						console.log('Validate Failed:', info);
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
							rules={[validateMinValue]}
							//   rules={[{ required: true, message: 'Please input the title of collection!' }]}
						>
							<InputNumber />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item 
							name="max" 
							label="Max (in ms)"
							rules = {[validateMaxValue]}
						>
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
