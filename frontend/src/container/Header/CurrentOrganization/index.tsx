import { PlusSquareOutlined } from '@ant-design/icons';
import { Avatar, Typography } from 'antd';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import {
	InviteMembersContainer,
	OrganizationContainer,
	OrganizationWrapper,
} from '../styles';

function CurrentOrganization(): JSX.Element {
	const { org, role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [currentOrgSettings, inviteMembers] = useComponentPermission(
		['current_org_settings', 'invite_members'],
		role,
	);

	// just to make sure role and org are present in the reducer
	if (!org || !role) {
		return <div />;
	}

	const orgName = org[0].name;

	return (
		<>
			<Typography>CURRENT ORGANIZATION</Typography>

			<OrganizationContainer>
				<OrganizationWrapper>
					<Avatar shape="square" size="large">
						{orgName}
					</Avatar>
					<Typography>{orgName}</Typography>
				</OrganizationWrapper>

				{currentOrgSettings && (
					<Typography.Link
						onClick={(): void => {
							history.push(ROUTES.ORG_SETTINGS);
						}}
					>
						Settings
					</Typography.Link>
				)}
			</OrganizationContainer>

			{inviteMembers && (
				<InviteMembersContainer>
					<PlusSquareOutlined />
					<Typography.Link>Invite Members</Typography.Link>
				</InviteMembersContainer>
			)}
		</>
	);
}

export default CurrentOrganization;
