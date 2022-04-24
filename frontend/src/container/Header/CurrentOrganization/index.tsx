import { PlusSquareOutlined } from '@ant-design/icons';
import { Avatar, Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';

import {
	InviteMembersContainer,
	OrganizationContainer,
	OrganizationWrapper,
} from '../styles';

function CurrentOrganiztion(): JSX.Element {
	return (
		<>
			<Typography>CURRENT ORGANIZATION</Typography>

			<OrganizationContainer>
				<OrganizationWrapper>
					<Avatar shape="square" size="large">
						S
					</Avatar>
					<Typography>SigNoz</Typography>
				</OrganizationWrapper>
				<Typography.Link
					onClick={(): void => {
						history.push(ROUTES.ORG_SETTINGS);
					}}
				>
					Settings
				</Typography.Link>
			</OrganizationContainer>
			<InviteMembersContainer>
				<PlusSquareOutlined />
				<Typography.Link>Invite Members</Typography.Link>
			</InviteMembersContainer>
		</>
	);
}

export default CurrentOrganiztion;
