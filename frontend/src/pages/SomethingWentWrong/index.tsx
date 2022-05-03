import { Button, Typography } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import SomethingWentWrongAsset from 'assets/SomethingWentWrong';
import { Container } from 'components/NotFound/styles';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { LOGGED_IN } from 'types/actions/app';

function SomethingWentWrong(): JSX.Element {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const isLoggedIn = getLocalStorageKey(LOCALSTORAGE.IS_LOGGED_IN);

	return (
		<Container>
			<SomethingWentWrongAsset />
			<Typography.Title level={3}>Oops! Something went wrong</Typography.Title>
			<Button
				type="primary"
				onClick={(): void => {
					if (isLoggedIn) {
						dispatch({
							type: LOGGED_IN,
							payload: {
								isLoggedIn: true,
							},
						});
					}

					history.push(ROUTES.APPLICATION);
				}}
			>
				Return to Metrics page
			</Button>
		</Container>
	);
}

export default SomethingWentWrong;
