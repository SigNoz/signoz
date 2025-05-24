import './OrganizationSettings.styles.scss';

import { Space } from 'antd';
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

	const isAuthDomain = !isNotSSO;

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

			<PendingInvitesContainer />

			<Members />

			{isAuthDomain && <AuthDomains />}
		</div>
	);
}

export default OrganizationSettings;
