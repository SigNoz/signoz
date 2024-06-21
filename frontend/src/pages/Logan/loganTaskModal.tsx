import {
	Button,
	DatePicker,
	Form,
	FormProps,
	Input,
	message,
	Modal,
	ModalProps as Props,
	Switch,
} from 'antd';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { cloneDeep, snakeCase } from 'lodash-es';
import { useEffect, useState } from 'react';

import { LoganTableType } from '.';
/* eslint-disable */
interface ModalProps {
	visible: boolean;
	isEdit?: boolean;
	record: LoganTableType | null;
	handleClose: (needFresh: boolean) => void;
}

interface TaskDataType {
	id?: number;
	name: string;
	userId: string;
	deviceId: string;
	timeSelect: Dayjs[];
	bugLink: string;
	desc: string;
	needReport: number;
}

const layout = {
	labelCol: { span: 6 },
	wrapperCol: { span: 18 },
};

const initTaskData = {
	name: '',
	userId: '',
	deviceId: '',
	timeSelect: [dayjs(), dayjs()],
	bugLink: '',
	desc: '',
	needReport: 0,
};

const { RangePicker } = DatePicker;

function LoganTaskModal({
	isEdit = false,
	visible = false,
	record,
	handleClose,
}: ModalProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [messageApi, contextHolder] = message.useMessage();

	const [form] = Form.useForm();
	const [taskData, setTaskData] = useState<TaskDataType>(
		cloneDeep(initTaskData),
	);

	const formatDataToInterface = (param: { [x: string]: any }) => {
		const finalParam = {} as any;
		for (const key in param as any) {
			if (String(param[key])) {
				if (key === 'timeSelect') {
					finalParam[snakeCase(key)] = param[key].join(',');
					continue;
				}
				finalParam[snakeCase(key)] = param[key];
			}
		}
		return finalParam;
	};

	const editTask = async () => {
		try {
			if (!record || !record.id) return false;
			const { data } = await axios.post(
				`${process.env.SERVER_API_HOST}/capi/logan/updateLoganTask`,
				{
					id: record.id,
					...taskData,
					timeSelect: taskData.timeSelect.map((item) =>
						dayjs(item).format('YYYY-MM-DD'),
					),
				},
			);
			if (data.result) {
				messageApi.open({
					type: 'success',
					content: 'update success',
				});
				return true;
			}
			messageApi.open({
				type: 'warning',
				content: data.message,
			});
			return false;
		} catch (error) {
			console.log('editTaskError', error);
			messageApi.open({
				type: 'error',
				content: 'EditTask Error',
			});
			return false;
		}
	};

	const createTask = async () => {
		try {
			const { data } = await axios.post(
				`${process.env.SERVER_API_HOST}/capi/logan/createLoganTask`,
				{
					...taskData,
					timeSelect: taskData.timeSelect.map((item) =>
						dayjs(item).format('YYYY-MM-DD'),
					),
				},
			);
			if (data.result) {
				messageApi.open({
					type: 'success',
					content: 'create success',
				});
				return true;
			}
			messageApi.open({
				type: 'warning',
				content: data.message,
			});
			return false;
		} catch (error) {
			console.log('createTaskError', error);
			messageApi.open({
				type: 'error',
				content: 'CreateTask Error',
			});
			return false;
		}
	};

	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			console.log('Success:', values);
			let result = false;
			console.log('record', record);
			if (record && record.id) {
				result = await editTask();
			} else {
				result = await createTask();
			}
			if (result) handleClose(true);
		} catch (error) {
			console.log('handleOkFail', error);
		}
	};

	const changeSwitch = (checked: boolean) => {
		console.log(`switch to ${checked}`);
		setTaskData((prev) => {
			return {
				...prev,
				needReport: Number(checked),
			};
		});
	};

	const handleInput = (type: string, value: string) => {
		setTaskData((prev) => {
			return {
				...prev,
				[type]: value,
			};
		});
	};

	useEffect(() => {
		if (isEdit && record) {
			setTaskData({
				...record,
				timeSelect: record.timeSelect.map((item) => dayjs(item)),
			});
			form.setFieldsValue({
				...record,
				timeSelect: record.timeSelect.map((item) => dayjs(item)),
			});
		} else {
			console.log('进来了这里', initTaskData);
			setTaskData(cloneDeep(initTaskData));
			form.setFieldsValue({
				...initTaskData,
				timeSelect: initTaskData.timeSelect.map((item) => dayjs(item)),
			});
		}
	}, [isEdit, record]);

	return (
		<>
			{contextHolder}
			<Modal
				title={`${isEdit ? 'Edit' : 'Create'} Task Modal`}
				open={visible}
				onCancel={() => handleClose(false)}
				onOk={handleOk}
			>
				<Form {...layout} form={form} name="loganTask" style={{ maxWidth: 600 }}>
					<Form.Item
						name="name"
						label="Task Name"
						rules={[{ required: true, message: 'Please input task name' }]}
					>
						<Input
							value={taskData.name}
							onChange={(e) => {
								// console.log('taskData.name', taskData.name);
								handleInput('name', e.target.value);
							}}
						/>
					</Form.Item>
					<Form.Item label="UserId">
						<Input
							value={taskData.userId}
							onChange={(e) => handleInput('userId', e.target.value)}
						/>
					</Form.Item>
					<Form.Item label="DeviceId">
						<Input
							value={taskData.deviceId}
							onChange={(e) => handleInput('deviceId', e.target.value)}
						/>
					</Form.Item>
					<Form.Item label="Time Select">
						<RangePicker
							format="YYYY-MM-DD"
							popupStyle={
								isDarkMode ? { backgroundColor: 'black' } : { backgroundColor: 'white' }
							}
							value={[taskData.timeSelect[0], taskData.timeSelect[1]]}
							onChange={(value, dateString: [string, string]) => {
								if (Array.isArray(value)) {
									setTaskData((prev) => {
										return {
											...prev,
											timeSelect: value as [Dayjs, Dayjs],
										};
									});
								}
							}}
						/>
					</Form.Item>
					<Form.Item name={'bugLink'} label="Bug Link">
						<Input
							value={taskData.bugLink}
							onChange={(e) => handleInput('bugLink', e.target.value)}
						/>
					</Form.Item>
					<Form.Item name={'desc'} label="Description">
						<Input.TextArea
							value={taskData.desc}
							onChange={(e) => handleInput('desc', e.target.value)}
						/>
					</Form.Item>
					<Form.Item name={'needReport'} label="Open Report">
						<Switch onChange={changeSwitch} checked={!!taskData.needReport} />
					</Form.Item>
				</Form>
			</Modal>
		</>
	);
}

export default LoganTaskModal;
