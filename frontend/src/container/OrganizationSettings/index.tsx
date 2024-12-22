import { Divider, Space } from 'antd';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import AuthDomains from './AuthDomains';
import DisplayName from './DisplayName';
import Members from './Members';
import PendingInvitesContainer from './PendingInvitesContainer';

function OrganizationSettings(): JSX.Element {
	const { org, featureFlags } = useAppContext();

	const isNotSSO =
		!featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	const isNoUpSell =
		!featureFlags?.find((flag) => flag.name === FeatureKeys.DISABLE_UPSELL)
			?.active || false;

	const isAuthDomain = !isNoUpSell || (isNoUpSell && !isNotSSO);

	if (!org) {
		return <div />;
	}

	return (
		<>
			<Space direction="vertical">
				{org.map((e, index) => (
					<DisplayName
						isAnonymous={e.isAnonymous}
						key={e.id}
						id={e.id}
						index={index}
					/>
				))}
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
