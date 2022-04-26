import { Avatar, Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { AvatarContainer, ManageAccountLink, Wrapper } from '../styles';

function SignedInAS(): JSX.Element {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	if (!user) {
		return <div />;
	}

	const { name, email } = user;

	return (
		<div>
			<Typography>SIGNED IN AS</Typography>
			<Wrapper>
				<AvatarContainer>
					<Avatar shape="circle" size="large">
						{name[0]}
					</Avatar>
					<div>
						<Typography>{name}</Typography>
						<Typography>{email}</Typography>
					</div>
				</AvatarContainer>
				<ManageAccountLink
					onClick={(): void => {
						history.push(ROUTES.MY_SETTINGS);
					}}
				>
					Manage Account
				</ManageAccountLink>
			</Wrapper>
		</div>
	);
}

export default SignedInAS;
