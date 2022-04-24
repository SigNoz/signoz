import { Button, Space, Typography } from 'antd';
import React, { useState } from 'react';

import { Password } from '../styles';

function PasswordContainer(): JSX.Element {
	const [currentPassword, setCurrentPassword] = useState<string>('');
	const [updatePassword, setUpdatePassword] = useState<string>('');

	return (
		<Space direction="vertical" size="large">
			<Typography.Title level={3}>Change Password</Typography.Title>
			<Space direction="vertical">
				<Typography>Current Password</Typography>
				<Password
					placeholder="input password"
					onChange={(event): void => {
						setCurrentPassword(event.target.value);
					}}
					value={currentPassword}
				/>
			</Space>
			<Space direction="vertical">
				<Typography>New Password</Typography>
				<Password
					placeholder="input password"
					onChange={(event): void => {
						setUpdatePassword(event.target.value);
					}}
					value={updatePassword}
				/>
			</Space>
			<Button type="primary">Change Password </Button>
		</Space>
	);
}

export default PasswordContainer;
