import { Divider, Space } from 'antd';
import { FeatureKeys } from 'constants/features';
import { useIsFeatureDisabled } from 'hooks/useFeatureFlag';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import AuthDomains from './AuthDomains';
import DisplayName from './DisplayName';
import Members from './Members';
import PendingInvitesContainer from './PendingInvitesContainer';

function OrganizationSettings(): JSX.Element {
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);

	const isNotSSO = useIsFeatureDisabled(FeatureKeys.SSO);

	const isNoUpSell = useIsFeatureDisabled(FeatureKeys.DISABLE_UPSELL);

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
