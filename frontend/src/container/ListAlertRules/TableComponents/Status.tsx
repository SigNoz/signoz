import { Tag } from 'antd';
import React from 'react';
import { Alerts } from 'types/api/alerts/getAll';

const Status = ({ status }: StatusProps): JSX.Element => {
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

		default: {
			return <Tag color="default">Unknown Status</Tag>;
		}
	}
};

interface StatusProps {
	status: Alerts['state'];
}

export default Status;
