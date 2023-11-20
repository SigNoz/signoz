import getLocalStorageKey from 'api/browser/localstorage/get';
import NotFoundImage from 'assets/NotFound';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { LOGGED_IN } from 'types/actions/app';

import { defaultText } from './constant';
import { Button, Container, Text, TextContainer } from './styles';

function NotFound({ text = defaultText }: Props): JSX.Element {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const isLoggedIn = getLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN);

	const onClickHandler = useCallback(() => {
		if (isLoggedIn) {
			dispatch({
				type: LOGGED_IN,
				payload: {
					isLoggedIn: true,
				},
			});
		}
	}, [dispatch, isLoggedIn]);

	return (
		<Container>
			<NotFoundImage />

			<TextContainer>
				<Text>{text}</Text>
				<Text>Page Not Found</Text>
			</TextContainer>

			<Button onClick={onClickHandler} to={ROUTES.APPLICATION} tabIndex={0}>
				Return To Services Page
			</Button>
		</Container>
	);
}

interface Props {
	text?: string;
}

NotFound.defaultProps = {
	text: defaultText,
};

export default NotFound;
