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
		default:
			return '';
	}
}
