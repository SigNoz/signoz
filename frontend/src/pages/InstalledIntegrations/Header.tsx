import './InstalledIntegrations.styles.scss';

import { Typography } from 'antd';

function Header(): JSX.Element {
	return (
		<div className="installed-integrations-header">
			<Typography.Title className="title">Integrations</Typography.Title>
			<Typography.Text className="subtitle">
				Manage Integrations for this workspace
			</Typography.Text>
		</div>
	);
}

export default Header;
