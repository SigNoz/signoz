import { Tag } from 'antd';
import { GettableAlert } from 'types/api/alerts/get';

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
	status: GettableAlert['state'];
}

export default Status;
