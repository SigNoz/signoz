import { Typography } from 'antd';
import getPreference from 'api/user/getPreference';
import getVersion from 'api/user/getVersion';
import Spinner from 'components/Spinner';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { PayloadProps as UserPrefPayload } from 'types/api/user/getUserPreference';
import { PayloadProps as VersionPayload } from 'types/api/user/getVersion';

import SignUpComponent from './SignUp';

function SignUp(): JSX.Element {
	const versionResponse = useFetch<VersionPayload, undefined>(getVersion);

	const userPrefResponse = useFetch<UserPrefPayload, undefined>(getPreference);

	if (versionResponse.error || userPrefResponse.error) {
		return (
			<Typography>
				{versionResponse.errorMessage ||
					userPrefResponse.errorMessage ||
					'Somehthing went wrong'}
			</Typography>
		);
	}

	if (
		versionResponse.loading ||
		versionResponse.payload === undefined ||
		userPrefResponse.loading ||
		userPrefResponse.payload === undefined
	) {
		return <Spinner tip="Loading.." />;
	}

	const { version } = versionResponse.payload;

	const userpref = userPrefResponse.payload;

	return <SignUpComponent userpref={userpref} version={version} />;
}

export default SignUp;
