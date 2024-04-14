import './PlannedDowntime.styles.scss';
import 'dayjs/locale/en';

import { PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Divider, Form, Input, Modal, Select } from 'antd';
import {
	ModalButtonWrapper,
	ModalTitle,
} from 'container/PipelinePage/PipelineListsView/styles';
import dayjs from 'dayjs';
import React from 'react';

interface PlannedDowntimeData {
	name: string;
	startTime: string;
	endTime: string;
	recurrence: string;
}

const customFormat = 'Do MMMM, YYYY ⎯ HH:mm:ss';
export function PlannedDowntime(): JSX.Element {
	const [isOpen, setIsOpen] = React.useState(false);
	const [form] = Form.useForm();

	dayjs.locale('en');
	const datePickerFooter = (mode: any): any =>
		mode === 'time' ? (
			<span style={{ color: 'gray' }}>Please select the time</span>
		) : null;

	const onFinish = (values: PlannedDowntimeData): void => {
		console.log(values);
	};

	const formValidationRules = [
		{
			required: true,
		},
	];

	const handleOk = async (): Promise<void> => {
		try {
			await form.validateFields();
			setIsOpen(false);
		} catch (error) {
			// error
		}
	};

	const handleCancel = (): void => {
		setIsOpen(false);
	};

	return (
		<>
			<Button
				icon={<PlusOutlined />}
				type="primary"
				onClick={(): void => setIsOpen(true)}
			>
				New downtime
			</Button>
			<Modal
				title={<ModalTitle level={4}>New planned downtime</ModalTitle>}
				centered
				open={isOpen}
				className="createDowntimeModal"
				width={384}
				onCancel={handleCancel}
				footer={null}
			>
				<Divider plain />
				<Form
					name="create-downtime"
					form={form}
					layout="vertical"
					className="createForm"
					onFinish={onFinish}
					autoComplete="off"
				>
					<Form.Item
						label="Name"
						name="name"
						required={false}
						rules={formValidationRules}
					>
						<Input placeholder="e.g. Upgrade downtime" />
					</Form.Item>
					<div className="bar">
						<Form.Item
							label="Starts from"
							name="startTime"
							required={false}
							rules={formValidationRules}
							className="formItemWithBullet"
						>
							<DatePicker
								format={customFormat}
								showTime
								renderExtraFooter={datePickerFooter}
								popupClassName="datePicker"
							/>
						</Form.Item>
						<Form.Item
							label="Ends on"
							name="endTime"
							required={false}
							rules={formValidationRules}
							className="formItemWithBullet"
						>
							<DatePicker
								format={customFormat}
								showTime
								renderExtraFooter={datePickerFooter}
								popupClassName="datePicker"
							/>
						</Form.Item>
					</div>
					<Form.Item
						label="Repeats every"
						name="recurrence"
						required={false}
						rules={formValidationRules}
					>
						<Select>
							<Select.Option value="does-not-repeat">Does not repeat</Select.Option>
						</Select>
					</Form.Item>
					<Form.Item label="Silence Alerts" name="alert-rules">
						<Select
							placeholder="Search for alerts rules or groups..."
							// notFoundContent={
							// 	loading ? (
							// 		<span>
							// 			<Spin size="small" /> Loading...
							// 		</span>
							// 	) : (
							// 	<span>
							// 		No resource attributes available to filter. Please refer docs to send
							// 		attributes.
							// 	</span>
							// 	)
							// }
						/>
					</Form.Item>
					<Form.Item>
						<ModalButtonWrapper>
							<Button key="submit" type="primary" htmlType="submit" onClick={handleOk}>
								Add downtime schedule
							</Button>
						</ModalButtonWrapper>
					</Form.Item>
				</Form>
			</Modal>
		</>
	);
}
