import React, { useState, useEffect } from "react";
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
    const [disabled, setDisabled] = useState<boolean>(false)
    const [min, setMin] = useState<number>(parseInt(latencyFilterValues.min))
    const [max, setMax] = useState<number>(parseInt(latencyFilterValues.max))
    
    useEffect(() => {
        min! > max! ? setDisabled(true) : setDisabled(false)
    },[min,max])
      
	return (
		<Modal
			visible={true}
			title="Chose min and max values of Latency"
			okText="Apply"
            cancelText="Cancel"
            okButtonProps={{disabled: disabled}}
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
							<InputNumber onChange={() => setMin(parseInt(form.getFieldValue("min")))} />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item name="max" label="Max (in ms)">
							<InputNumber onChange={() => setMax(parseInt(form.getFieldValue("max")))} />
						</Form.Item>
					</Col>
				</Row>
				{/* </Input.Group> */}
			</Form>
            {disabled && <span style={{position: 'relative', top: 10, marginLeft: 200}}>max value should be greater then min value</span>}
		</Modal>
	);
};

export default LatencyModalForm;
