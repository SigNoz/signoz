import React from 'react';
import { Alerts } from 'types/api/alerts/getAllList';
import { Tag } from 'antd';

const Status = ({ status }: StatusProps): JSX.Element => {
	switch (status) {
		case 'warning': {
			return <Tag color="warning">Warning</Tag>;
		}

		case 'ok': {
			return <Tag color="green">Ok</Tag>;
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
	status: Alerts['labels']['severity'];
}

export default Status;
