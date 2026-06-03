import { Badge } from '@signozhq/ui/badge';

interface AlertStatusTagProps {
	state: string;
}

function AlertStatusTag({ state }: AlertStatusTagProps): JSX.Element {
	switch (state) {
		case 'unprocessed':
			return (
				<Badge color="success" variant="outline">
					Unprocessed
				</Badge>
			);
		case 'active':
			return (
				<Badge color="error" variant="outline">
					Firing
				</Badge>
			);
		case 'suppressed':
			return (
				<Badge color="error" variant="outline">
					Suppressed
				</Badge>
			);
		default:
			return (
				<Badge color="secondary" variant="outline">
					Unknown
				</Badge>
			);
	}
}

export default AlertStatusTag;
