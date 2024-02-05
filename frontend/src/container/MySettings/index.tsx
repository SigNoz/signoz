import './MySettings.styles.scss';

import { Button, Space } from 'antd';
import { Logout } from 'api/utils';
import { LogOut } from 'lucide-react';

import Password from './Password';
import UserInfo from './UserInfo';

function MySettings(): JSX.Element {
	return (
		<Space
			direction="vertical"
			size="large"
			style={{
				margin: '16px 0',
			}}
		>
			<UserInfo />

			<Password />

			<Button className="flexBtn" onClick={(): void => Logout()} type="primary">
				<LogOut size={12} /> Logout
			</Button>
		</Space>
	);
}

export default MySettings;
