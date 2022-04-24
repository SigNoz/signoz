import { Avatar, Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';

import { AvatarContainer, ManageAccountLink, Wrapper } from '../styles';

function SignedInAS(): JSX.Element {
	return (
		<div>
			<Typography>SIGNED IN AS</Typography>
			<Wrapper>
				<AvatarContainer>
					<Avatar shape="circle" size="large">
						asd
					</Avatar>
					<div>
						<Typography>Pranay</Typography>
						<Typography>pranay.iitm@gmail.com</Typography>
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
