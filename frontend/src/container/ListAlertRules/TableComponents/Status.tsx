import { Tag } from 'antd';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';

function Status({ status }: StatusProps): JSX.Element {
	switch (status) {
		case 'inactive': {
			return <Tag color="green">OK</Tag>;
		}

		case 'pending': {
			return <Tag color="orange">Pending</Tag>;
		}

		case 'firing': {
			return <Tag color="red">Firing</Tag>;
		}

		case 'disabled': {
			return <Tag>Disabled</Tag>;
		}

		default: {
			return <Tag color="default">Unknown</Tag>;
		}
	}
}

interface StatusProps {
	status: RuletypesRuleDTO['state'];
}

export default Status;
