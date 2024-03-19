import { DeleteOutlined } from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import {
	Button,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Radio,
	Select,
	Space,
	Table,
	TableProps,
} from 'antd';
import getAllProjectList from 'api/projectManager/ignoreError';
import axios from 'axios';
import { cloneDeep } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';

/* eslint-disable */
type FieldType = {
	sample_rate: number;
	rule: string;
};

type RuleItem = {
	id?: number | string;
	error_type?: number;
	service_name?: string;
	filter_name: string;
	filter_values: string;
	opearation_type: number;
	sample_rate: number;
	isNew?: boolean;
};

const initRuleItem = {
	id: new Date().getTime(),
	filter_name: 'message',
	filter_values: '',
	opearation_type: 1,
	sample_rate: 1,
};

const opTypeMap: { [key: string]: string } = {
	1: 'regex',
	2: 'not_regex',
	3: '=',
	4: '!=',
};
// env, path, sdkVersion, tag, deviceId, platform, url, userAgent, message
const FilterNameOptions = [
	{ value: 'env', label: 'error.env' },
	{ value: 'path', label: 'error.path' },
	{ value: 'sdkVersion', label: 'error.sdkVersion' },
	{ value: 'tag', label: 'error.tag' },
	{ value: 'deviceId', label: 'error.deviceId' },
	{ value: 'platform', label: 'error.platform' },
	{ value: 'url', label: 'error.url' },
	{ value: 'userAgent', label: 'error.userAgent' },
	{ value: 'message', label: 'error.message' },
];

const { confirm } = Modal;

function IngoreError(): JSX.Element {
	const [messageApi, contextHolder] = message.useMessage();
	const [form] = Form.useForm();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [ruleList, setRuleList] = useState<RuleItem[]>([]);
	const [deleteList, setDeleteList] = useState<RuleItem[]>([]);
	const [projectList, setProjectList] = useState<string[]>([]);
	const [currentProject, setCurrentProject] = useState<string>('');
	const [currentRadio, setCurrentRadio] = useState<number>(1);
	const [curRecordRule, setCurRecordRule] = useState<RuleItem>();
	const [searchLoading, setSearchLoading] = useState<boolean>(false);

	const handleModalShow = (isShow: boolean) => {
		setIsModalOpen(isShow);
	};

	const handleModalOk = () => {
		if (!curRecordRule?.filter_values) {
			messageApi.open({
				type: 'warning',
				content: 'please finish input value first',
			});
			return;
		}
		handleModalShow(false);
	};

	const handleModalCancel = () => {
		if (!curRecordRule?.filter_values) {
			const newList = ruleList.filter((item) => item.filter_values);
			setRuleList(newList);
		}
		handleModalShow(false);
	};

	const handleEdit = (type: string, record: RuleItem) => {
		console.log('handleEdit', ruleList);
		const lib: { [key: string]: () => void } = {
			edit: () => {
				setCurRecordRule(record);
				console.log('record', record);
				handleModalShow(true);
			},
			delete: () => {
				confirm({
					title: 'Do you Want to delete this rule?',
					icon: <DeleteOutlined />,
					// content: 'Some descriptions',
					onOk() {
						const newList = cloneDeep(ruleList).filter(
							(item) => item.id !== record.id,
						);
						setRuleList(newList);
						// 非为保存新增的
						if (!record.isNew) {
							setDeleteList((prev) => {
								return [...prev, record];
							});
						}
					},
					onCancel() {
						console.log('Cancel');
					},
				});
			},
		};
		lib[type]();
	};

	const columns: TableProps<RuleItem>['columns'] = [
		{
			title: 'Sample Rate',
			dataIndex: 'sample_rate',
			key: 'sample_rate',
			// render: (text, record, index) => <a>{text}</a>,
		},
		{
			title: 'Rules',
			dataIndex: 'rulesStr',
			key: 'address',
			render: (text, record, index) => {
				const opTypeStr = opTypeMap[record.opearation_type || '1'];
				return (
					<div>
						<span style={{ marginRight: 5 }}>{record.filter_name}</span>
						<span style={{ marginRight: 5 }}>{opTypeStr}</span>
						<span style={{ marginRight: 5 }}>{record.filter_values}</span>
					</div>
				);
			},
		},
		{
			title: 'Action',
			key: 'action',
			render: (_, record) => (
				<Space size="middle">
					<a onClick={() => handleEdit('edit', record)}>Edit</a>
					<a onClick={() => handleEdit('delete', record)}>Delete</a>
				</Space>
			),
		},
	];

	const tableDataSource = useMemo(() => {
		return ruleList.map((item) => ({ ...item, key: item.id }));
	}, [ruleList]);

	const handleAddNewRule = () => {
		const newList = cloneDeep(ruleList);
		newList.push(
			cloneDeep({
				...initRuleItem,
				id: new Date().getTime(),
				isNew: true,
				error_type: currentRadio,
				service_name: currentProject,
			}),
		);
		setRuleList(newList);
	};

	const searchAllRules = async (projectId: string, errorType: number) => {
		try {
			setSearchLoading(true);
			const { data } = await axios.get(
				`${process.env.SERVER_API_HOST}/portal/searchIgnoreRules`,
				{
					params: {
						service_name: projectId,
						error_type: errorType,
					},
				},
			);
			console.log('data', data);
			if (data.result) {
				setRuleList(data.data);
			}
		} catch (error) {
			console.error('searchAllRulesError', error);
		} finally {
			setSearchLoading(false);
		}
	};

	const handleChangeProject = (value: string) => {
		setCurrentProject(value);
		searchAllRules(value, currentRadio);
	};

	const hanleChangeRadio = ({ target: { value } }: RadioChangeEvent) => {
		console.log('radio', value);
		setCurrentRadio(value);
		searchAllRules(currentProject, value);
	};

	const getAllProject = async () => {
		try {
			const res = await getAllProjectList();
			// console.log('res', res);
			if (res.payload?.length) {
				setProjectList(res.payload);
				setCurrentProject(res.payload[0]);
				searchAllRules(res.payload[0], 1);
			}
		} catch (error) {
			console.log('getAllProjectError', error);
		}
	};

	const setIgnoreRules = async (list: any) => {
		try {
			const { data } = await axios.post(
				`${process.env.SERVER_API_HOST}/portal/setIgnoreRules`,
				list,
			);
			if (!data.result) {
				messageApi.open({
					type: 'warning',
					content: data.message,
				});
			}
		} catch (error) {
			console.error('setIgnoreRulesError', error);
		}
	};

	const deleteIgnoreRules = async (list: any) => {
		try {
			const { data } = await axios.post(
				`${process.env.SERVER_API_HOST}/portal/deleteIgnoreRules`,
				list,
			);
			if (data.result) {
				setDeleteList([]);
				return;
			}
			messageApi.open({
				type: 'warning',
				content: data.message,
			});
		} catch (error) {
			console.error('deleteIgnoreRulesError', error);
		}
	};

	const handleChangeCurRule = (type: string, value: string | number) => {
		console.log('handleChangeCurRule', type, value);
		const newRecord = {
			...curRecordRule,
			[type]: value,
		};
		setCurRecordRule(newRecord as RuleItem);
		const newRuleList = ruleList.map((ruleItem) => {
			if (ruleItem.id === newRecord.id) {
				return newRecord;
			}
			return ruleItem;
		});
		console.log('newRuleList', newRuleList);
		setRuleList(newRuleList as RuleItem[]);
	};

	const handleSubmit = async () => {
		console.log('ruleList', ruleList, deleteList);
		const newRuleList = ruleList.filter((item) => item.filter_values);
		if (!newRuleList.length && !deleteList.length) return;
		setRuleList(newRuleList);
		try {
			setSearchLoading(true);
			const finalList = newRuleList.map((item) => {
				const newItem = cloneDeep(item);
				if (item.isNew) {
					delete newItem.id;
					delete newItem.isNew;
				}
				return newItem;
			});
			await setIgnoreRules(finalList);
			if (deleteList.length) {
				await deleteIgnoreRules(deleteList);
			}
			messageApi.open({
				type: 'success',
				content: 'update success',
			});
			setTimeout(() => {
				searchAllRules(currentProject, currentRadio);
			}, 800);
		} catch (error) {
			console.log('handleSubmitError', error);
			messageApi.open({
				type: 'warning',
				content: JSON.stringify(error) || 'update error',
			});
		} finally {
			setSearchLoading(false);
		}
	};

	useEffect(() => {
		getAllProject();
	}, [getAllProject]);

	return (
		<>
			{contextHolder}
			<h1>Ingore Setting</h1>
			<Form form={form} labelCol={{ span: 2 }}>
				<Form.Item label="类型">
					{/* <Tabs defaultActiveKey="1" items={items} onChange={onChange} /> */}
					<Radio.Group
						// defaultValue={1}
						buttonStyle="solid"
						onChange={hanleChangeRadio}
						value={currentRadio}
					>
						<Radio.Button value={1}>JS ERROR</Radio.Button>
						<Radio.Button value={2}>XHR/FETCH</Radio.Button>
						<Radio.Button value={3}>RESOURCE</Radio.Button>
					</Radio.Group>
				</Form.Item>
				<Form.Item label="项目">
					<Select
						// defaultValue={projectList?.[0]}
						value={currentProject}
						showSearch
						placeholder="Select a project"
						style={{ width: 180 }}
						onChange={handleChangeProject}
						options={projectList.map((item) => ({
							value: item,
							label: item,
						}))}
					/>
				</Form.Item>
				<Form.Item label="规则配置">
					<Button
						style={{ marginBottom: 10 }}
						type="primary"
						onClick={handleAddNewRule}
					>
						Add new rule
					</Button>
					<Table
						columns={columns}
						dataSource={tableDataSource}
						loading={searchLoading}
					/>
				</Form.Item>
				<Form.Item label=" " colon={false}>
					<Button type="primary" htmlType="submit" onClick={handleSubmit}>
						Submit
					</Button>
				</Form.Item>
			</Form>

			{/* edit pop */}
			<Modal
				title="Edit ignore rule"
				open={isModalOpen}
				onOk={handleModalOk}
				onCancel={handleModalCancel}
				width={900}
			>
				<Form labelCol={{ span: 4 }}>
					<Form.Item<FieldType>
						label="采样率"
						name="sample_rate"
						rules={[{ required: true, message: 'Please input sample rate' }]}
					>
						<div>
							<InputNumber
								max={1}
								min={0}
								placeholder="please input sample rate"
								style={{ width: 200 }}
								value={Number(curRecordRule?.sample_rate)}
								onChange={(value) => handleChangeCurRule('sample_rate', value || 0)}
							/>
						</div>
					</Form.Item>
					<Form.Item<FieldType>
						label="选择过滤条件"
						name="rule"
						rules={[{ required: true, message: 'Please set rules first' }]}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
							}}
						>
							<Select
								value={curRecordRule?.filter_name}
								onChange={(value) => handleChangeCurRule('filter_name', value)}
								options={FilterNameOptions}
								style={{ marginRight: 10 }}
							/>
							<Select
								value={curRecordRule?.opearation_type || 1}
								style={{ marginRight: 10 }}
								onChange={(value) => handleChangeCurRule('opearation_type', value)}
								options={Object.keys(opTypeMap).map((key) => {
									return {
										label: opTypeMap[key],
										value: Number(key),
									};
								})}
							/>
							<Input
								placeholder="please input"
								style={{ marginRight: 10 }}
								value={curRecordRule?.filter_values}
								onChange={(e) => handleChangeCurRule('filter_values', e.target.value)}
							/>
							{/* <DeleteFilled
								onClick={() => handleDeleteRule()}
								style={{ color: '#eb2f96' }}
							/> */}
						</div>
					</Form.Item>
				</Form>
			</Modal>
		</>
	);
}

export default IngoreError;
