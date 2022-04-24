import { Divider } from 'antd';
import React from 'react';

import DisplayName from './DisplayName';
import Members from './Members';
import PendingInvitesContainer from './PendingInvitesContainer';

function OrganizationSettings(): JSX.Element {
	return (
		<>
			<DisplayName />
			<Divider />
			<PendingInvitesContainer />
			<Divider />
			<Members />
		</>
	);
}

export default OrganizationSettings;
