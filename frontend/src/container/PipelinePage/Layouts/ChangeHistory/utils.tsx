import {
	CheckCircleFilled,
	CloseCircleFilled,
	ExclamationCircleFilled,
	LoadingOutlined,
	MinusCircleFilled,
} from '@ant-design/icons';
import { Spin } from 'antd';

export function getDeploymentStage(value: string): string {
	switch (value) {
		case 'IN_PROGRESS':
			return 'In Progress';
		case 'DEPLOYED':
			return 'Deployed';
		case 'DIRTY':
			return 'Dirty';
		case 'FAILED':
			return 'Failed';
		case 'UNKNOWN':
			return 'Unknown';
		default:
			return '';
	}
}

export function getDeploymentStageIcon(value: string): JSX.Element {
	switch (value) {
		case 'IN_PROGRESS':
			return (
				<Spin indicator={<LoadingOutlined style={{ fontSize: 15 }} spin />} />
			);
		case 'DEPLOYED':
			return <CheckCircleFilled />;
		case 'DIRTY':
			return <ExclamationCircleFilled />;
		case 'FAILED':
			return <CloseCircleFilled />;
		case 'UNKNOWN':
			return <MinusCircleFilled />;
		default:
			return <span />;
	}
}
