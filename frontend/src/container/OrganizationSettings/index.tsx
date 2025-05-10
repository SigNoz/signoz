import { Divider, Space } from 'antd';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import AuthDomains from './AuthDomains';
import DisplayName from './DisplayName';
import Members from './Members';
import PendingInvitesContainer from './PendingInvitesContainer';

function OrganizationSettings(): JSX.Element {
	const { organization, featureFlags } = useAppContext();

	const isNotSSO =
		!featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	const isAuthDomain = !isNotSSO;

	if (!organization) {
		return <div />;
	}

	return (
		<>
			<Space direction="vertical">
				<DisplayName id={organization?.id || ''} />
			</Space>
			<Divider />
			<PendingInvitesContainer />
			<Divider />
			<Members />
			<Divider />
			{isAuthDomain && <AuthDomains />}
		</>
	);
}

export default OrganizationSettings;
