import { Avatar, Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { AvatarContainer, ManageAccountLink, Wrapper } from '../styles';

function SignedIn({ onToggle }: SignedInProps): JSX.Element {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	const onManageAccountClick = useCallback(() => {
		onToggle();
		history.push(ROUTES.MY_SETTINGS);
	}, [onToggle]);

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
				<ManageAccountLink onClick={onManageAccountClick}>
					Manage Account
				</ManageAccountLink>
			</Wrapper>
		</div>
	);
}

interface SignedInProps {
	onToggle: VoidFunction;
}

export default SignedIn;
