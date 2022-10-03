import getLocalStorageKey from 'api/browser/localstorage/get';
import NotFoundImage from 'assets/NotFound';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import React from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { LOGGED_IN } from 'types/actions/app';

import { Button, Container, Text, TextContainer } from './styles';

function NotFound(): JSX.Element {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const isLoggedIn = getLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN);

	return (
		<Container>
			<NotFoundImage />

			<TextContainer>
				<Text>Ah, seems like we reached a dead end!</Text>
				<Text>Page Not Found</Text>
			</TextContainer>

			<Button
				onClick={(): void => {
					if (isLoggedIn) {
						dispatch({
							type: LOGGED_IN,
							payload: {
								isLoggedIn: true,
							},
						});
					}
				}}
				to={ROUTES.APPLICATION}
				tabIndex={0}
			>
				Return To Services Page
			</Button>
		</Container>
	);
}

export default NotFound;
