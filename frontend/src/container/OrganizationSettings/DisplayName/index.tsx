import { Button, Input, Space, Typography } from 'antd';
import React from 'react';

function DisplayName(): JSX.Element {
	return (
		<Space direction="vertical">
			<Typography.Title level={3}>Display Name</Typography.Title>
			<Space direction="vertical" size="middle">
				<Input size="large" placeholder="SigNoz" />
				<Button type="primary">Change Org Name </Button>
			</Space>
		</Space>
	);
}

export default DisplayName;
