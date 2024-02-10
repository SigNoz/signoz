import { Avatar, Dropdown, Layout, Switch, Typography } from 'antd';
import styled from 'styled-components';

export const Header = styled(Layout.Header)`
	background: #1f1f1f !important;
	padding-left: 16px;
	padding-right: 16px;
`;

export const Container = styled.div`
	display: flex;
	justify-content: space-between;
	height: 4rem;
`;

export const AvatarContainer = styled.div`
	display: flex;
	gap: 1rem;
`;

export const Wrapper = styled.div`
	display: flex;
	justify-content: space-between;
	margin-top: 1rem;
`;

export const ManageAccountLink = styled(Typography.Link)`
	width: 6rem;
	text-align: end;
`;

export const OrganizationWrapper = styled.div`
	display: flex;
	gap: 1rem;
	align-items: center;
	margin-top: 1rem;
`;

export const OrganizationContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

export const InviteMembersContainer = styled.div`
	display: flex;
	gap: 0.5rem;
	align-items: center;
	margin-top: 1.25rem;
`;

export const LogoutContainer = styled.div`
	display: flex;
	gap: 0.5rem;
	align-items: center;
`;

export interface DarkModeProps {
	checked?: boolean;
	defaultChecked?: boolean;
}

export const ToggleButton = styled(Switch)<DarkModeProps>`
	&&& {
		background: ${({ checked }): string => (checked === false ? 'grey' : '')};
	}
	.ant-switch-inner {
		font-size: 1rem !important;
	}
`;

export const IconContainer = styled.div`
	color: white;
`;

export const NavLinkWrapper = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	gap: 0.5rem;
`;

export const AvatarWrapper = styled(Avatar)`
	background-color: rgba(255, 255, 255, 0.25);
`;

export const UserDropdown = styled(Dropdown)`
	cursor: pointer;
`;
