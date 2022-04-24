import { Space, Typography } from 'antd';
import React from 'react';

import Password from './Password';
import UpdateName from './UpdateName';

function MySettings(): JSX.Element {
	return (
		<Space direction="vertical" size="large">
			<Typography.Title level={2}>My Settings</Typography.Title>
			<UpdateName />
			<Password />
		</Space>
	);
}

export default MySettings;
