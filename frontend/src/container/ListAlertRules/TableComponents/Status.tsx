import { Badge } from '@signozhq/ui/badge';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';

function Status({ status }: StatusProps): JSX.Element {
	switch (status) {
		case 'inactive': {
			return (
				<Badge color="forest" variant="outline">
					OK
				</Badge>
			);
		}

		case 'pending': {
			return (
				<Badge color="amber" variant="outline">
					Pending
				</Badge>
			);
		}

		case 'firing': {
			return (
				<Badge color="cherry" variant="outline">
					Firing
				</Badge>
			);
		}

		case 'disabled': {
			return (
				<Badge color="vanilla" variant="outline">
					Disabled
				</Badge>
			);
		}

		default: {
			return (
				<Badge color="vanilla" variant="outline">
					Unknown
				</Badge>
			);
		}
	}
}

interface StatusProps {
	status: RuletypesRuleDTO['state'];
}

export default Status;
