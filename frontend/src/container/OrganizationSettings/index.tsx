import { Divider, Space } from 'antd';
import { useAppContext } from 'providers/App/App';

import AuthDomains from './AuthDomains';
import DisplayName from './DisplayName';
import Members from './Members';
import PendingInvitesContainer from './PendingInvitesContainer';

function OrganizationSettings(): JSX.Element {
	const { org } = useAppContext();

	if (!org) {
		return <div />;
	}

	return (
		<>
			<Space direction="vertical">
				{org.map((e, index) => (
					<DisplayName key={e.id} id={e.id} index={index} />
				))}
			</Space>
			<Divider />
			<PendingInvitesContainer />
			<Divider />
			<Members />
			<Divider />
			<AuthDomains />
		</>
	);
}

export default OrganizationSettings;
