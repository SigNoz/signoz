import { Tag } from 'antd';

function Severity({ severity }: SeverityProps): JSX.Element {
	switch (severity) {
		case 'unprocessed': {
			return <Tag color="green">UnProcessed</Tag>;
		}

		case 'active': {
			return <Tag color="red">Firing</Tag>;
		}

		case 'suppressed': {
			return <Tag color="red">Suppressed</Tag>;
		}

		default: {
			return <Tag color="default">Unknown Status</Tag>;
		}
	}
}

interface SeverityProps {
	severity: string;
}

export default Severity;
