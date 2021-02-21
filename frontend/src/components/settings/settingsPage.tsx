import React, { useEffect, useState } from "react";
import { Form, Input, Space } from "antd";
import { connect } from "react-redux";
import { Tooltip } from "antd";
import {
	InfoCircleOutlined,
	EyeTwoTone,
	EyeInvisibleOutlined,
} from "@ant-design/icons";
import { StoreState } from "../../reducers";
import { useAuthenticationData } from "../../hooks/authentication";
import { TOKEN_DATE } from "../../../../../sass/frontend/src/constants/accessToken";
import { Alert } from "antd";

interface SettingsPageProps {}

const layout = {
	labelCol: { span: 3 },
	wrapperCol: { span: 6 },
};

const SettingsPage = (props: SettingsPageProps) => {
	const [form] = Form.useForm();

	useEffect(() => {
		form.setFieldsValue({
			retention_period: "3 days",
		});
	});

	return (
		<React.Fragment>
			<Form
				{...layout}
				name="basic"
				initialValues={{ remember: true }}
				style={{ marginLeft: 20 }}
				form={form}
			>
				<Form.Item
					label="Retention Period"
					name="retention_period"
					rules={[{ required: false }]}
				>
					<Input style={{ marginLeft: 60 }} disabled={true} />
				</Form.Item>
			</Form>

			<Space style={{ marginLeft: 60, marginTop: 48 }}>
				<Alert
					message="Mail us at plans@signoz.io to change your plan or retention period"
					type="info"
				/>
			</Space>
		</React.Fragment>
	);
};

const mapStateToProps = (state: StoreState): {} => {
	return {};
};

export default connect(mapStateToProps, {})(SettingsPage);
