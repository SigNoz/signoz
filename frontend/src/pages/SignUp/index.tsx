import { Typography } from 'antd';
import getUserPreference from 'api/user/getPreference';
import getUserVersion from 'api/user/getVersion';
import Spinner from 'components/Spinner';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import SignUpComponent from './SignUp';

function SignUp(): JSX.Element {
	const { t } = useTranslation('common');
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);

	const [versionResponse, userPrefResponse] = useQueries([
		{
			queryFn: getUserVersion,
			queryKey: 'getUserVersion',
			enabled: !isLoggedIn,
		},
		{
			queryFn: getUserPreference,
			queryKey: 'getUserPreference',
			enabled: !isLoggedIn,
		},
	]);

	if (
		versionResponse.status === 'error' ||
		userPrefResponse.status === 'error'
	) {
		return (
			<Typography>
				{versionResponse.data?.error ||
					userPrefResponse.data?.error ||
					t('something_went_wrong')}
			</Typography>
		);
	}

	if (
		versionResponse.status === 'loading' ||
		userPrefResponse.status === 'loading' ||
		!(versionResponse.data && versionResponse.data.payload) ||
		!(userPrefResponse.data && userPrefResponse.data.payload)
	) {
		return <Spinner tip="Loading..." />;
	}

	const { version } = versionResponse.data.payload;

	const userpref = userPrefResponse.data.payload;

	return <SignUpComponent userpref={userpref} version={version} />;
}

export default SignUp;
