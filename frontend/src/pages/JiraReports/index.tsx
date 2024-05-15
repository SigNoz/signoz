import { SearchOutlined } from '@ant-design/icons';
import {
	Button,
	Col,
	DatePicker,
	DatePickerProps,
	Row,
	Select,
	Tooltip,
} from 'antd';
import { RangePickerProps } from 'antd/es/date-picker';
import { getDayBugList } from 'api/JiraReports';
import getAllProjectList from 'api/projectManager/ignoreError';
import axiosRef from 'axios';
import {
	ArcElement,
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Decimation,
	DoughnutController,
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
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

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
	// const { pathname } = useLocation();
	const [currentProject, setCurrentProject] = useState<string>('');
	const [projectList, setProjectList] = useState<string[]>([]);
	const [curTimeList, setCurTimeList] = useState<Dayjs[]>([dayjs(), dayjs()]);
	const [lineDataList, setLineDataList] = useState<any[]>([]);

	const xTimeListMemo = useMemo(() => {
		const list: Dayjs[] = [];
		if (curTimeList.length === 2) {
			const diffCount = dayjs(curTimeList[1]).diff(dayjs(curTimeList[0]), 'day');
			// console.log('diffCount', diffCount);
			for (let i = 0; i <= diffCount; i++) {
				const tmpDay = dayjs(curTimeList[0]).add(i, 'day');
				// console.log('day', tmpDay.format('YYYY-MM-DD'));
				list.push(tmpDay);
			}
			// console.log('list', list);
			return list.map((item) => item.startOf('day').valueOf());
		}
		return list;
	}, [curTimeList]);

	const handleChangeProject = (value: string) => {
		setCurrentProject(value);
	};

	const getAllProject = async () => {
		try {
			const res = await getAllProjectList();
			// console.log('res', res);
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
			const res = await getDayBugList({
				start: `${curTimeList[0].startOf('day').valueOf()}000000`,
				end: `${curTimeList[1].endOf('day').valueOf()}000000`,
				service: currentProject,
			});
			if (Array.isArray(res.payload)) {
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
					// data: res.payload?.map((dayBugItem) => {
					// 	return {
					// 		x: dayjs(dayBugItem.time).endOf('day').valueOf(),
					// 		y: dayBugItem.count,
					// 	};
					// }),
					backgroundColor: item.backgroundColor,
					borderColor: item.borderColor,
					borderWidth: 3,
				}));
				setLineDataList(datasets);
			}
		} catch (error) {
			console.log('getAllProjectError', error);
		}
	};

	const handleRange = (
		value: DatePickerProps['value'] | RangePickerProps['value'],
	) => {
		console.log('onOk: ', value);
	};

	const setPie = () => {
		const ctx = window.document.getElementById('myChart')?.getContext('2d');
		const myPieChart = new Chart(ctx, {
			type: 'pie', // 指定图表类型为饼图
			data: {
				labels: ['红色', '蓝色', '黄色'],
				datasets: [
					{
						label: 'My First Dataset',
						data: [300, 50, 100],
						backgroundColor: [
							'rgb(255, 99, 132)',
							'rgb(54, 162, 235)',
							'rgb(255, 205, 86)',
						],
						hoverOffset: 4,
					},
				],
			},
			options: {
				responsive: true, // 图表将会响应式地调整大小
				plugins: {
					legend: {
						position: 'top', // 图例的位置
					},
					title: {
						display: true,
						text: '我的饼图',
					},
				},
			},
		});
	};

	const handleSearch = async () => {
		await getBugList();
		setPie();
		// const lineList = bugList?.map((item) => {
		// 	return item.data;
		// });
		// for (let j = 0; j < 2; j++) {
		// 	const epic = `EcpiTest_${j}`;
		// 	let data = [];
		// 	for (let i = 0; i < 3; i++) {
		// 		data.push({
		// 			serviceName: epic,
		// 			title: `title_${epic}_${i}_${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
		// 			description: {
		// 				type: 'doc',
		// 				version: 1,
		// 				content: [
		// 					{
		// 						type: 'paragraph',
		// 						content: [
		// 							{
		// 								type: 'text',
		// 								text: 'Hello world',
		// 								marks: [
		// 									{
		// 										type: 'link',
		// 										attrs: {
		// 											href: 'http://atlassian.com',
		// 											title: 'Atlassian',
		// 										},
		// 									},
		// 								],
		// 							},
		// 						],
		// 					},
		// 				],
		// 			},
		// 			errorId: String(new Date().getTime()),
		// 		});
		// 	}
		// 	axiosRef.post(
		// 		// `${process.env.SERVER_API_HOST}/capi/jira/createIssueBulk`,
		// 		`https://pulse.tb1.sayweee.net/capi/jira/createIssueBulk`,
		// 		data,
		// 		{
		// 			headers: {
		// 				authorization: 'Basic emhpY2hhby5nYW9Ac2F5d2VlZS5jb206emhpY2hhby5nYW8=',
		// 			},
		// 		},
		// 	);
		// 	// }
		// }
	};

	useEffect(() => {
		getAllProject();
	}, []);

	return (
		<>
			{/* <div>项目筛选</div>
			<div>时间筛选</div>
			<div>
				查询类别筛选：
				bug状态为not fix的，bug状态为ignore的，折线图，以天为单位
			</div>
			<div>
				统计出jira_issue表中出现重复上报的issue以及频次，以及总次数，jira当期状态，table
			</div>
			<div>统计出不同issue状态数量占比，饼状图</div> */}

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
						onChange={(value, dateString: [string, string]) => {
							console.log('Selected Time: ', value);
							console.log('Formatted Selected Time: ', dateString);
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
				<div style={{ width: 800 }}>
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
				<div style={{ width: 400, height: 400 }}>
					<canvas id="myChart" />
				</div>
			</div>
			<div>table</div>
		</>
	);
}

export default JiraReports;
