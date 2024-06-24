import { ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import {
	Button,
	Col,
	DatePicker,
	Form,
	Input,
	message,
	Modal,
	Row,
	Select,
	Space,
	Table,
	Tag,
} from 'antd';
import axios from 'axios';
import { ResizeTable } from 'components/ResizeTable';
import dayjs, { Dayjs } from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { camelCase } from 'lodash-es';
import { useEffect, useState } from 'react';

import LoganTaskModal from './loganTaskModal';
/* eslint-disable */
export interface LoganTableType {
	id: number;
	name: string;
	userId: string;
	deviceId: string;
	timeSelect: string[];
	createAt: string;
	needReport: number;
	isReported: number;
	logFileName: string;
	bugLink: string;
	desc: string;
}

interface SearchParamType {
	name?: string;
	userId?: string;
	deviceId?: string;
	isReported?: number;
}

type Pagination = {
	current: number;
	pageSize: number;
};

interface FinalSearchParamType extends SearchParamType {
	page: Pagination;
}
type OnChange = NonNullable<TableProps<LoganTableType>['onChange']>;

const { RangePicker } = DatePicker;

function Logan(): JSX.Element {
	const [modal, contextHolder] = Modal.useModal();
	const [messageApi] = message.useMessage();
	const isDarkMode = useIsDarkMode();
	const [timeSelect, setTimeSelect] = useState<Dayjs[]>([
		// dayjs().subtract(7, 'day'),
		// dayjs(),
	]);
	const [modalVisible, setModalVisible] = useState<boolean>(false);
	const [modalIsEdit, setModalIsEdit] = useState<boolean>(false);
	const [searchLoading, setSearchLoading] = useState<boolean>(false);
	const [tableData, setTableData] = useState<LoganTableType[]>([]);
	const [tableTotal, setTableTotal] = useState<number>(0);
	const [curRecord, setCurRecord] = useState<LoganTableType | null>(null);
	const [pagination, setPagination] = useState<Pagination>({
		current: 1,
		pageSize: 20,
	});
	const [searchParam, setSearchParam] = useState<SearchParamType>();

	const handleShowModal = (isEdit: boolean) => {
		setModalIsEdit(isEdit);
		setModalVisible(true);
	};

	const handleEdit = (record: LoganTableType) => {
		setCurRecord(record);
		handleShowModal(true);
	};

	const handleCreate = () => {
		setCurRecord(null);
		handleShowModal(false);
	};

	const deleteTask = async (id: number) => {
		try {
			const { data } = await axios.post(
				`${process.env.SERVER_API_HOST}/capi/logan/deleteLoganTask`,
				{
					id,
				},
			);
			if (data.result) {
				messageApi.open({
					type: 'success',
					content: 'delete success',
				});
				return true;
			}
			messageApi.open({
				type: 'warning',
				content: data.message,
			});
			return false;
		} catch (error) {
			console.log('deleteTaskError', error);
			messageApi.open({
				type: 'error',
				content: 'Update Error',
			});
			return false;
		}
	};

	const handleDelete = (record: LoganTableType) => {
		modal.confirm({
			title: 'Confirm',
			icon: <ExclamationCircleOutlined />,
			content: 'You sure to delete current record?',
			async onOk() {
				console.log('OK');
				const res = await deleteTask(record.id);
				if (res) handleSearch();
			},
			onCancel() {
				console.log('Cancel');
			},
		});
	};

	const columns: TableProps<LoganTableType>['columns'] = [
		{
			title: 'Task Name',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'UserId',
			dataIndex: 'userId',
			key: 'userId',
		},
		{
			title: 'DeviceId',
			dataIndex: 'deviceId',
			key: 'deviceId',
		},
		{
			title: 'Enable Report',
			dataIndex: 'needReport',
			key: 'needReport',
			render: (value, record) => <span>{value === 1 ? 'Yes' : 'No'}</span>,
		},
		{
			title: 'Is Reported',
			dataIndex: 'isReported',
			key: 'isReported',
			render: (value, record) => <span>{value === 1 ? 'Yes' : 'No'}</span>,
		},
		{
			title: 'Time Select',
			dataIndex: 'timeSelect',
			key: 'timeSelect',
			render: (value, record) => {
				return record.timeSelect.map((item: string) => (
					<span style={{ marginRight: 14 }}>{dayjs(item).format('MM/DD/YYYY')}</span>
				));
			},
		},
		{
			title: 'Create Time',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (value, record) => (
				<span>{dayjs(value).format('MM/DD/YYYY HH:mm:ss')}</span>
			),
		},
		{
			title: 'Bug Link',
			dataIndex: 'bugLink',
			key: 'bugLink',
		},
		{
			title: 'File Address',
			dataIndex: 'logFileName',
			key: 'logFileName',
			render: (value, record) => {
				return (
					<div style={{}}>
						{record.logFileName ? (
							record.logFileName.split(',').map((item: string, i: number) => (
								<a
									key={i}
									href={`${process.env.LOGAN_FILE_PATH}${item}`}
									target="_blank"
									style={{ display: 'block' }}
								>
									{item}
								</a>
							))
						) : (
							<></>
						)}
					</div>
				);
			},
		},
		{
			title: 'Operation',
			key: 'action',
			render: (_, record) => (
				<Space size="middle">
					<a onClick={() => handleEdit(record)}>Edit</a>
					<a onClick={() => handleDelete(record)}>Delete</a>
				</Space>
			),
		},
	];

	const formatDataToPage = (param: { [x: string]: any }) => {
		const finalParam = {} as any;
		for (const key in param as any) {
			if (String(param[key])) {
				if (key === 'time_select') {
					finalParam[camelCase(key)] = param[key].split(',');
					continue;
				}
				finalParam[camelCase(key)] = param[key];
			}
		}
		return finalParam;
	};

	const searchLogan = async (searchParam: any) => {
		try {
			setSearchLoading(true);
			const { data } = await axios.post(
				`${process.env.SERVER_API_HOST}/capi/logan/searchLoganTable`,
				searchParam,
			);
			if (data.result) {
				const list =
					data.data?.list?.map((item: any) => {
						return formatDataToPage(item);
					}) || [];
				setTableData(list);
				setTableTotal(data?.data?.total || 0);
			}
		} catch (error) {
			console.error('searchAllRulesError', error);
		} finally {
			setSearchLoading(false);
		}
	};

	const handleTableChange: OnChange = (page, filters, sorter) => {
		setPagination((prev) => ({
			...prev,
			current: page.current || 1,
		}));
		let tmpPag: Pagination = {
			current: page.current || 0,
			pageSize: page.pageSize || 0,
		};
		// console.log('hhh', tmpPag);
		handleSearch(tmpPag);
	};

	const handleSearch = (paramPage?: Pagination) => {
		const param: FinalSearchParamType = {
			...searchParam,
			page: paramPage || pagination,
		};

		for (const key in param) {
			if (!String((param as any)[key])) {
				delete (param as any)[key];
			}
		}
		if (timeSelect.length) {
			Object.assign(param, {
				timeSelect: timeSelect.map((item) => dayjs(item).format('YYYY-MM-DD')),
			});
		}
		searchLogan(param);
	};

	const handleInput = (type: string, value: string | number) => {
		setSearchParam((prev) => {
			return {
				...prev,
				[type]: value,
			};
		});
	};

	useEffect(() => {
		handleSearch();
	}, []);

	return (
		<>
			{contextHolder}
			<h1 style={isDarkMode ? { color: 'white' } : { color: 'black' }}>Logan</h1>
			<div>
				<Form name="search-form" layout="inline">
					<Form.Item label="Task Name" style={{ marginBottom: 10 }}>
						<Input
							style={{ width: 160 }}
							placeholder="Please input"
							allowClear
							value={searchParam?.name}
							onChange={(e) => handleInput('name', e.target.value)}
						/>
					</Form.Item>
					<Form.Item label="UserId" style={{ marginBottom: 10 }}>
						<Input
							style={{ width: 160 }}
							placeholder="Please input"
							value={searchParam?.userId}
							onChange={(e) => handleInput('userId', e.target.value)}
							allowClear
						/>
					</Form.Item>
					<Form.Item label="DeviceId" style={{ marginBottom: 10 }}>
						<Input
							style={{ width: 160 }}
							placeholder="Please input"
							value={searchParam?.deviceId}
							onChange={(e) => handleInput('deviceId', e.target.value)}
							allowClear
						/>
					</Form.Item>
					<Form.Item label="Create Time" style={{ marginBottom: 10 }}>
						<RangePicker
							format="YYYY-MM-DD"
							popupStyle={
								isDarkMode ? { backgroundColor: 'black' } : { backgroundColor: 'white' }
							}
							defaultValue={[timeSelect[0], timeSelect[1]]}
							onChange={(value, dateString: [string, string]) => {
								if (Array.isArray(value)) {
									setTimeSelect(value as [Dayjs, Dayjs]);
								} else {
									setTimeSelect([]);
								}
							}}
						/>
					</Form.Item>
					<Form.Item label="Is Reported" style={{ marginBottom: 10 }}>
						<Select
							allowClear
							placeholder="Select a project"
							style={{ width: 180 }}
							onChange={(value: string) => {
								handleInput('isReported', value);
							}}
							options={[
								{
									value: 1,
									label: 'Yes',
								},
								{
									value: 0,
									label: 'No',
								},
							]}
						/>
					</Form.Item>
					<Form.Item label=" " colon={false} style={{ marginBottom: 10 }}>
						<Button type="primary" onClick={() => handleSearch()}>
							Search
						</Button>
					</Form.Item>
				</Form>
			</div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'flex-end',
					alignItems: 'center',
					marginBottom: 10,
				}}
			>
				<Button type="primary" onClick={handleCreate}>
					Create Task
				</Button>
			</div>
			<ResizeTable
				columns={columns}
				rowKey={(record) => record.id}
				dataSource={tableData}
				loading={searchLoading}
				pagination={{
					...pagination,
					total: tableTotal,
				}}
				onChange={handleTableChange}
			/>

			{/* modal弹窗 */}
			<LoganTaskModal
				visible={modalVisible}
				isEdit={modalIsEdit}
				record={curRecord}
				handleClose={(needFresh: boolean) => {
					setModalVisible(false);
					if (needFresh) handleSearch();
				}}
			/>
		</>
	);
}

export default Logan;
