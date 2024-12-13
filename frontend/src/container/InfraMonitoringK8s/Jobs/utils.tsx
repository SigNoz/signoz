import { Color } from '@signozhq/design-tokens';
import { Progress } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	K8sJobsData,
	K8sJobsListPayload,
} from 'api/infraMonitoring/getK8sJobsList';

import { IEntityColumn } from '../utils';

export const defaultAddedColumns: IEntityColumn[] = [
	{
		label: 'Namespace Status',
		value: 'NamespaceStatus',
		id: 'NamespaceStatus',
		canRemove: false,
	},
	{
		label: 'CPU Utilization (cores)',
		value: 'cpuUsage',
		id: 'cpuUsage',
		canRemove: false,
	},
	{
		label: 'CPU Allocatable (cores)',
		value: 'cpuAllocatable',
		id: 'cpuAllocatable',
		canRemove: false,
	},
	{
		label: 'Memory Allocatable (bytes)',
		value: 'memoryAllocatable',
		id: 'memoryAllocatable',
		canRemove: false,
	},
	{
		label: 'Pods count by phase',
		value: 'podsCount',
		id: 'podsCount',
		canRemove: false,
	},
];

export interface K8sJobsRowData {
	key: string;
	jobName: string;
	availableReplicas: number;
	desiredReplicas: number;
	cpuRequestUtilization: React.ReactNode;
	cpuLimitUtilization: React.ReactNode;
	cpuUtilization: number;
	memoryRequestUtilization: React.ReactNode;
	memoryLimitUtilization: React.ReactNode;
	memoryUtilization: number;
	jobRestarts: number;
}

export const getK8sJobsListQuery = (): K8sJobsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'cpu', order: 'desc' },
});

const columnsConfig = [
	{
		title: <div className="column-header-left">Job</div>,
		dataIndex: 'jobName',
		key: 'jobName',
		ellipsis: true,
		width: 150,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Available Replicas</div>,
		dataIndex: 'availableReplicas',
		key: 'availableReplicas',
		width: 100,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Desired Replicas</div>,
		dataIndex: 'desiredReplicas',
		key: 'desiredReplicas',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				CPU Request Utilization (% of limit)
			</div>
		),
		dataIndex: 'cpuRequestUtilization',
		key: 'cpuRequestUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				CPU Limit Utilization (% of request)
			</div>
		),
		dataIndex: 'cpuLimitUtilization',
		key: 'cpuLimitUtilization',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">CPU Utilization (cores)</div>,
		dataIndex: 'cpuUtilization',
		key: 'cpuUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				Memory Request Utilization (% of limit)
			</div>
		),
		dataIndex: 'memoryRequestUtilization',
		key: 'memoryRequestUtilization',
		width: 50,
		sorter: true,
		align: 'left',
	},
	{
		title: (
			<div className="column-header-left">
				Memory Limit Utilization (% of request)
			</div>
		),
		dataIndex: 'memoryLimitUtilization',
		key: 'memoryLimitUtilization',
		width: 80,
		sorter: true,
		align: 'left',
	},
	{
		title: <div className="column-header-left">Job Restarts</div>,
		dataIndex: 'jobRestarts',
		key: 'jobRestarts',
		width: 50,
		sorter: true,
		align: 'left',
	},
];

export const getK8sJobsListColumns = (): ColumnType<K8sJobsRowData>[] =>
	columnsConfig as ColumnType<K8sJobsRowData>[];

const getStrokeColorForProgressBar = (value: number): string => {
	if (value >= 90) return Color.BG_SAKURA_500;
	if (value >= 60) return Color.BG_AMBER_500;
	return Color.BG_FOREST_500;
};

export const formatDataForTable = (data: K8sJobsData[]): K8sJobsRowData[] =>
	data.map((job, index) => ({
		key: `${job.meta.k8s_job_name}-${index}`,
		jobName: job.meta.k8s_job_name,
		availableReplicas: job.availablePods,
		desiredReplicas: job.desiredPods,
		jobRestarts: job.restarts,
		cpuUtilization: job.cpuUsage,
		cpuRequestUtilization: (
			<div className="progress-job">
				<Progress
					percent={Number((job.cpuRequest * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const cpuPercent = Number((job.cpuRequest * 100).toFixed(1));
						return getStrokeColorForProgressBar(cpuPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
		cpuLimitUtilization: (
			<div className="progress-job">
				<Progress
					percent={Number((job.cpuLimit * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const cpuPercent = Number((job.cpuLimit * 100).toFixed(1));
						return getStrokeColorForProgressBar(cpuPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
		memoryUtilization: job.memoryUsage,
		memoryRequestUtilization: (
			<div className="progress-job">
				<Progress
					percent={Number((job.memoryRequest * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const memoryPercent = Number((job.memoryRequest * 100).toFixed(1));
						return getStrokeColorForProgressBar(memoryPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
		memoryLimitUtilization: (
			<div className="progress-job">
				<Progress
					percent={Number((job.memoryLimit * 100).toFixed(1))}
					strokeLinecap="butt"
					size="small"
					status="active"
					strokeColor={((): string => {
						const memoryPercent = Number((job.memoryLimit * 100).toFixed(1));
						return getStrokeColorForProgressBar(memoryPercent);
					})()}
					className="progress-bar"
				/>
			</div>
		),
	}));
