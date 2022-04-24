import userLoginApi from 'api/user/login';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect, useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_USER_IS_FETCH } from 'types/actions/app';
import AppReducer from 'types/reducer/app';

import routes from './routes';

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
	const { pathname } = useLocation();
	const mapRoutes = useMemo(() => new Map(routes.map((e) => [e.path, e])), []);
	const {
		// user,
		isUserFetching,
		isUserFetchingError,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const currentRoute = mapRoutes.get(pathname);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		(async (): Promise<void> => {
			try {
				if (currentRoute) {
					const { isPrivate, redirectIfNotLoggedIn } = currentRoute;

					if (isPrivate) {
						const response = await userLoginApi({
							email: '',
							password: '',
						});

						if (response.statusCode === 200) {
							console.log(response);
						} else {
							// fetching user failed
						}
					} else {
						if (pathname !== ROUTES.LOGIN && redirectIfNotLoggedIn) {
							history.push(ROUTES.LOGIN);
						}

						// no need to fetch the user and make user fetching false
						dispatch({
							type: UPDATE_USER_IS_FETCH,
							payload: {
								isUserFetching: false,
							},
						});
					}
				} else {
					history.push(ROUTES.SOMETHING_WENT_WRONG);
				}
			} catch (error) {
				history.push(ROUTES.SOMETHING_WENT_WRONG);
			}
		})();
	}, [currentRoute, dispatch, mapRoutes, pathname]);

	if (isUserFetchingError) {
		return <Redirect to={ROUTES.SOMETHING_WENT_WRONG} />;
	}

	if (isUserFetching) {
		return <Spinner tip="Loading..." />;
	}

	// NOTE: disabling this rule as there is no need to have div
	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <>{children}</>;
}

interface PrivateRouteProps {
	children: React.ReactChild;
}

export default PrivateRoute;
