import { Badge } from '@signozhq/ui/badge';

function Severity({ severity }: SeverityProps): JSX.Element {
	switch (severity) {
		case 'unprocessed': {
			return <Badge color="forest">UnProcessed</Badge>;
		}

		case 'active': {
			return <Badge color="cherry">Firing</Badge>;
		}

		case 'suppressed': {
			return <Badge color="cherry">Suppressed</Badge>;
		}

		default: {
			return <Badge color="vanilla">Unknown Status</Badge>;
		}
	}
}

interface SeverityProps {
	severity: string;
}

export default Severity;
