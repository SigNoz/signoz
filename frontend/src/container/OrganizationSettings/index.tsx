import { Divider, Space } from 'antd';
import useFeatureFlag from 'hooks/getFeatureFlag';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import DisplayName from './DisplayName';
import Members from './Members';
import PendingInvitesContainer from './PendingInvitesContainer';
import SAMLSettings from './SAMLSettings';

function OrganizationSettings(): JSX.Element {
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);

	const [EnterprisePlanFeatureFlag] = useFeatureFlag(
		['ENTERPRISE_PLAN'],
		'SAML',
	);

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
			{EnterprisePlanFeatureFlag && <SAMLSettings />}
		</>
	);
}

export default OrganizationSettings;
