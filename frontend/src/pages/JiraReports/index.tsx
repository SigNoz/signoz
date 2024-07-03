import { grey } from '@ant-design/colors';
import { SearchOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import {
	Button,
	Col,
	DatePicker,
	Row,
	Select,
	Tooltip,
	Typography,
} from 'antd';
import { getDayBugList, getRepeatIssuesTable } from 'api/JiraReports';
import getAllProjectList from 'api/projectManager/ignoreError';
import axiosRef from 'axios';
import {
	ArcElement,
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Decimation,
	Filler,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PieController,
	PointElement,
	SubTitle,
	TimeScale,
	TimeSeriesScale,
	Title,
} from 'chart.js';
import Graph from 'components/Graph';
import { ResizeTable } from 'components/ResizeTable';
import dayjs, { Dayjs } from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import createQueryParams from 'lib/createQueryParams';
import { useEffect, useMemo, useRef, useState } from 'react';
/* eslint-disable */
interface PieData {
	CLOSED: number;
	'DEPLOYED TO PRODUCTION': number;
	'DEV IN PROGRESS': number;
	'DONT FIX': number;
	'IN QA': number;
	NEW: number;
	'NOT BUG': number;
}

interface DataType {
	count: number;
	created_at: string;
	error_unique_id: string;
	issue_key: string;
	issue_project_id: string;
	issue_repeat_count: number;
	issue_status: string;
	issue_title: string;
	issue_type: string;
}

type ColumnsType<T> = TableProps<T>['columns'];

type Pagination = {
	current: number;
	pageSize: number;
};
type TableParamType = {
	pagination: Pagination;
	sortOrder: string;
	sortParam: string;
};

type OnChange = NonNullable<TableProps<DataType>['onChange']>;
type GetSingle<T> = T extends (infer U)[] ? U : never;
type Sorts = GetSingle<Parameters<OnChange>[2]>;

const { RangePicker } = DatePicker;

Chart.register(
	LineElement,
	PointElement,
	LineController,
	CategoryScale,
	LinearScale,
	TimeScale,
	TimeSeriesScale,
	Decimation,
	Filler,
	Legend,
	Title,
	SubTitle,
	BarController,
	BarElement,
	PieController,
	ArcElement,
);

function JiraReports(): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [currentProject, setCurrentProject] = useState<string>('');
	const [projectList, setProjectList] = useState<string[]>([]);
	const [curTimeList, setCurTimeList] = useState<Dayjs[]>([
		dayjs().subtract(7, 'day'),
		dayjs(),
	]);
	const [lineDataList, setLineDataList] = useState<any[]>([]);
	const chartRef = useRef<HTMLCanvasElement>(null);
	const pieChartRef = useRef<Chart>();
	const [tableData, setTableData] = useState<DataType[]>();
	const [loading, setLoading] = useState(false);
	const [tableParams, setTableParams] = useState<TableParamType>({
		pagination: {
			current: 1,
			pageSize: 20,
		},
		sortOrder: '',
		sortParam: '',
	});
	const [tableTotal, setTableTotal] = useState<number>(0);
	// 用于控制排序的状态
	const [sortedInfo, setSortedInfo] = useState<Sorts>({});
	const [pieData, setPieData] = useState<PieData | null>(null);

	const xTimeListMemo = useMemo(() => {
		const list: Dayjs[] = [];
		if (curTimeList.length === 2) {
			const diffCount = dayjs(curTimeList[1]).diff(dayjs(curTimeList[0]), 'day');
			for (let i = 0; i <= diffCount; i++) {
				const tmpDay = dayjs(curTimeList[0]).add(i, 'day');
				list.push(tmpDay);
			}
			return list.map((item) => item.startOf('day').valueOf());
		}
		return list;
	}, [curTimeList]);

	const pieDataEmpty = useMemo(() => {
		if (!pieData) return true;
		const existNum = Object.values(pieData)?.find((item: any) => item > 0);
		return !existNum;
	}, [pieData]);

	const handleChangeProject = (value: string) => {
		setCurrentProject(value);
	};

	const getAllProject = async () => {
		try {
			const res = await getAllProjectList();
			if (res.payload?.length) {
				setProjectList(res.payload);
				setCurrentProject(res.payload[0]);
			}
		} catch (error) {
			console.log('getAllProjectError', error);
		}
	};

	const getBugList = async () => {
		try {
			if (!currentProject || curTimeList.length < 2) return;

			const res = await getDayBugList({
				start: `${curTimeList[0].startOf('day').valueOf()}000000`,
				end: `${curTimeList[1].endOf('day').valueOf()}000000`,
				service: currentProject,
			});
			if (Array.isArray(res.payload) && res.payload.length) {
				const statusList = [
					{
						label: 'Not fix',
						issueStatus: 0,
						backgroundColor: 'rgba(54,73,93,.5)',
						borderColor: '#36495d',
					},
					{
						label: 'Ignored',
						issueStatus: 3,
						backgroundColor: 'rgba(71, 183,132,.5)',
						borderColor: '#47b784',
					},
				];
				const datasets = statusList.map((item) => ({
					label: item.label,
					data: xTimeListMemo.map((xTime) => {
						const match = res.payload?.find(
							(dayBugItem) =>
								dayjs(xTime).format('YYYY-MM-DD') ===
									dayjs(dayBugItem.time).format('YYYY-MM-DD') &&
								dayBugItem.issueStatus === item.issueStatus,
						);
						return match?.count || 0;
					}),
					backgroundColor: item.backgroundColor,
					borderColor: item.borderColor,
					borderWidth: 3,
				}));
				setLineDataList(datasets);
				return;
			}
			setLineDataList([]);
		} catch (error) {
			console.log('getAllProjectError', error);
			setLineDataList([]);
		}
	};

	const getIssuesPie = async () => {
		if (!currentProject || curTimeList.length < 2) return;

		const { data } = await axiosRef.get(
			`${process.env.SERVER_API_HOST}/capi/jira/getIssuesCount`,
			{
				params: {
					start: curTimeList[0].startOf('day').valueOf(),
					end: curTimeList[1].endOf('day').valueOf(),
					serviceName: currentProject,
				},
			},
		);
		return data.data || null;
	};

	const getTableList = async (
		pagination: Pagination | null,
		sortParam: string,
		sortOrder: string,
	) => {
		try {
			const param = {
				serviceName: currentProject,
				start: curTimeList[0].valueOf(),
				end: curTimeList[1].valueOf(),
			};
			if (!param.serviceName || !param.start || !param.end) return;

			// count排序不需要分页
			if (pagination) {
				Object.assign(param, { pagination });
			}
			if (sortParam) {
				Object.assign(param, { sortParam });
			}
			if (sortOrder) {
				Object.assign(param, { sortOrder });
			}
			setLoading(true);
			const { payload } = await getRepeatIssuesTable(param);
			if (payload?.issues?.length) {
				setTableData(payload.issues);
				setTableTotal(payload.total);
			} else {
				setTableData([]);
				setTableTotal(0);
			}
			setLoading(false);
		} catch (error) {
			console.warn('getTableListError', error);
			setLoading(false);
		}
	};

	const reset = () => {
		setTableParams((prev) => ({
			pagination: {
				current: 1,
				pageSize: prev.pagination.pageSize,
			},
			sortOrder: '',
			sortParam: '',
		}));
		setSortedInfo({});
	};

	const handleSearch = async () => {
		reset();
		await getBugList();
		const data = await getIssuesPie();
		if (data) {
			setPieData(data);
		} else {
			setPieData(null);
		}
		getTableList(
			{
				current: 1,
				pageSize: tableParams.pagination.pageSize,
			},
			'',
			'',
		);
	};

	const columns: ColumnsType<DataType> = [
		{
			title: 'Title',
			dataIndex: 'issue_title',
			width: 140,
			render: (value, record): JSX.Element => {
				return (
					<Tooltip overlay={(): JSX.Element => value}>
						<Typography.Paragraph
							ellipsis={{
								rows: 2,
							}}
						>
							<a
								target="_blank"
								style={{ display: 'inline' }}
								href={`${
									process.env.FRONTEND_API_ENDPOINT
								}/website/exceptions?${createQueryParams({
									serviceName: record.issue_project_id,
									message: record.issue_title,
									startTime: `${curTimeList[0].startOf('day').valueOf()}000000`,
									endTime: `${curTimeList[1].endOf('day').valueOf()}000000`,
								})}`}
							>
								{value}
							</a>
						</Typography.Paragraph>
					</Tooltip>
				);
			},
		},
		{
			title: 'Type',
			dataIndex: 'issue_type',
			width: 50,
			render: (value: string, record: DataType): JSX.Element => {
				const lib: { [key: string]: string } = {
					'story bug': 'Alert Bug',
					Story: 'Alert',
				};
				if (lib[value.toLocaleLowerCase()]) {
					return (<>{lib[value.toLocaleLowerCase()]}</>) as JSX.Element;
				}
				return (<>{value}</>) as JSX.Element;
			},
		},
		{
			title: 'Issue Status',
			dataIndex: 'issue_status',
			width: 50,
		},
		{
			title: 'Issue Key',
			dataIndex: 'issue_key',
			width: 50,
			render: (value: string, record: DataType): JSX.Element => {
				return (
					<a
						target="_blank"
						style={{ display: 'inline' }}
						href={`${process.env.JIRA_HOST}/browse/${value}`}
					>
						{value}
					</a>
				);
			},
		},
		{
			title: 'Alert Repeat Count',
			dataIndex: 'issue_repeat_count',
			width: 50,
			sorter: true,
			sortOrder:
				sortedInfo.field === 'issue_repeat_count' ? sortedInfo.order : null,
		},
		{
			title: 'Exception Count',
			dataIndex: 'count',
			width: 50,
			sorter: true,
			sortOrder: sortedInfo.field === 'count' ? sortedInfo.order : null,
		},
		{
			title: 'Created At',
			dataIndex: 'created_at',
			width: 100,
			render: (value: string) => `${dayjs(value).format('MM/DD/YYYY HH:mm:ss')}`,
		},
	];

	const handleTableChange: OnChange = (pagination, filters, sorter) => {
		setSortedInfo(sorter as Sorts);
		setTableParams((prev) => {
			return {
				pagination: {
					...prev.pagination,
					current: pagination.current || 1,
				},
				sortOrder: (sorter as any)?.order,
				sortParam: (sorter as any)?.field,
			};
		});
		let tmpPag: Pagination | null = {
			current: pagination.current || 0,
			pageSize: pagination.pageSize || 0,
		};
		if ((sorter as any)?.field === 'count' && (sorter as any)?.order) {
			tmpPag = null;
		}
		getTableList(tmpPag, (sorter as any)?.field, (sorter as any)?.order);
	};

	useEffect(() => {
		getAllProject();
	}, []);

	useEffect(() => {
		handleSearch();
	}, [currentProject]);

	useEffect(() => {
		if (pieChartRef.current !== undefined) {
			pieChartRef.current.destroy();
		}
		// console.log('chartRef.current', chartRef.current);
		if (!chartRef.current || pieDataEmpty || !pieData) return;
		// @ts-ignore
		pieChartRef.current = new Chart(chartRef.current, {
			type: 'pie', // 指定图表类型为饼图
			data: {
				labels: Object.keys(pieData),
				datasets: [
					{
						data: Object.keys(pieData).map((key) => pieData[key as keyof PieData]),
						backgroundColor: [
							'rgb(255, 99, 132)',
							'rgb(54, 162, 235)',
							'rgb(255, 205, 86)',
							'#1f77b4',
							'#ff7f0e',
							'#2ca02c',
							'#d62728',
						],
						hoverOffset: 4,
					},
				],
			},
			options: {
				responsive: true, // 图表将会响应式地调整大小
				plugins: {
					legend: {
						position: 'bottom', // 图例的位置
						labels: {
							color: isDarkMode ? 'white' : 'black',
						},
					},
					title: {
						display: true,
						font: {
							size: 24,
						},
						padding: 20,
						color: isDarkMode ? 'white' : 'black',
						text: 'Different status of issue count',
					},
				},
			},
		});
	}, [pieDataEmpty, pieData]);

	return (
		<>
			<h1 style={isDarkMode ? { color: 'white' } : { color: 'black' }}>
				Jira Reports
			</h1>

			<Row gutter={16}>
				<Col span={4}>
					<Select
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
				</Col>
				<Col span={6}>
					<RangePicker
						format="YYYY-MM-DD"
						allowClear={false}
						defaultValue={[curTimeList[0], curTimeList[1]]}
						onChange={(value, dateString: [string, string]) => {
							if (Array.isArray(value)) {
								setCurTimeList(value as [Dayjs, Dayjs]);
							}
						}}
					/>
				</Col>
				<Col span={3}>
					<Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
						Search
					</Button>
				</Col>
			</Row>

			<div style={{ display: 'flex' }}>
				<div style={{ width: 900 }}>
					<h2 style={isDarkMode ? { color: 'white' } : { color: 'black' }}>
						Day Bugs List
					</h2>
					<Graph
						name="jira_line"
						data={{
							labels: xTimeListMemo,
							datasets: lineDataList,
						}}
						type="line"
						containerHeight="400px"
						animate
					/>
				</div>
				<div
					style={{
						width: 400,
						height: 460,
						display: 'flex',
						justifyContent: 'center',
					}}
				>
					<div
						style={
							pieDataEmpty
								? { display: 'none', width: '100%' }
								: { display: 'block', width: '100%' }
						}
					>
						<canvas ref={chartRef} style={{ width: 400 }} />
					</div>
					<p
						style={
							pieDataEmpty
								? { display: 'block', width: '100%', marginTop: 240 }
								: { display: 'none', width: '100%', marginTop: 240 }
						}
					>
						<span style={{ fontSize: '1.5rem', color: grey.primary }}>No data</span>
					</p>
				</div>
			</div>
			<div style={{ marginTop: 20 }}>
				<h2 style={isDarkMode ? { color: 'white' } : { color: 'black' }}>
					Issues Table
				</h2>
				<ResizeTable
					columns={columns}
					rowKey={(record) => record.issue_key}
					dataSource={tableData}
					pagination={{
						...tableParams.pagination,
						total: tableTotal,
					}}
					loading={loading}
					onChange={handleTableChange}
				/>
			</div>
		</>
	);
}

export default JiraReports;
