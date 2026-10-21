import { Badge } from '@signozhq/ui/badge';

interface AlertStatusTagProps {
	state: string;
	testId?: string;
}

function AlertStatusTag({ state, testId }: AlertStatusTagProps): JSX.Element {
	switch (state) {
		case 'unprocessed':
			return (
				<Badge color="success" variant="outlined" testId={testId}>
					Unprocessed
				</Badge>
			);
		case 'active':
			return (
				<Badge color="danger" variant="outlined" testId={testId}>
					Firing
				</Badge>
			);
		case 'suppressed':
			return (
				<Badge color="danger" variant="outlined" testId={testId}>
					Suppressed
				</Badge>
			);
		default:
			return (
				<Badge color="secondary" variant="outlined" testId={testId}>
					Unknown
				</Badge>
			);
	}
}

export default AlertStatusTag;
