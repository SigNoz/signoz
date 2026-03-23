import { Space } from 'antd';
import { useAppContext } from 'providers/App/App';

import AuthDomain from './AuthDomain';
import DisplayName from './DisplayName';

import './OrganizationSettings.styles.scss';

function OrganizationSettings(): JSX.Element {
	const { org } = useAppContext();

	if (!org) {
		return <div />;
	}

	return (
		<div className="organization-settings-container">
			<Space direction="vertical">
				{org.map((e, index) => (
					<DisplayName key={e.id} id={e.id} index={index} />
				))}
			</Space>

			<AuthDomain />
		</div>
	);
}

export default OrganizationSettings;
