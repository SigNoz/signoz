import { Spin } from 'antd';
import {
	CircleMinus,
	Loader,
	SolidCheckCircle2,
	SolidAlertOctagon,
	SolidXCircle,
} from '@signozhq/icons';

export function getDeploymentStage(value: string): string {
	switch (value) {
		case 'in_progress':
			return 'In Progress';
		case 'deployed':
			return 'Deployed';
		case 'dirty':
			return 'Dirty';
		case 'failed':
			return 'Failed';
		case 'unknown':
			return 'Unknown';
		default:
			return '';
	}
}

export function getDeploymentStageIcon(value: string): JSX.Element {
	switch (value) {
		case 'in_progress':
			return (
				<Spin
					data-testid="deployment-icon-in-progress"
					indicator={<Loader style={{ fontSize: 15 }} className="animate-spin" />}
				/>
			);
		case 'deployed':
			return (
				<SolidCheckCircle2 size="md" data-testid="deployment-icon-deployed" />
			);
		case 'dirty':
			return <SolidAlertOctagon size="md" data-testid="deployment-icon-dirty" />;
		case 'failed':
			return <SolidXCircle size="md" data-testid="deployment-icon-failed" />;
		case 'unknown':
			return <CircleMinus size="md" data-testid="deployment-icon-unknown" />;
		default:
			return <span />;
	}
}
