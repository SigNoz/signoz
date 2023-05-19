import { PlusSquareOutlined } from '@ant-design/icons';
import { Avatar, Typography } from 'antd';
import { INVITE_MEMBERS_HASH } from 'constants/app';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import {
	InviteMembersContainer,
	OrganizationContainer,
	OrganizationWrapper,
} from '../styles';

function CurrentOrganization({
	onToggle,
}: CurrentOrganizationProps): JSX.Element {
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
							onToggle();
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
					<Typography.Link
						onClick={(): void => {
							onToggle();
							history.push(`${ROUTES.ORG_SETTINGS}${INVITE_MEMBERS_HASH}`);
						}}
					>
						Invite Members
					</Typography.Link>
				</InviteMembersContainer>
			)}
		</>
	);
}

interface CurrentOrganizationProps {
	onToggle: VoidFunction;
}

export default CurrentOrganization;
