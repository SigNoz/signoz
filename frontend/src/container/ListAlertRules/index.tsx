import getAll from 'api/alerts/getAll';
import Spinner from 'components/Spinner';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { PayloadProps } from 'types/api/alerts/getAll';

import ListAlert from './ListAlert';

const ListAlertRules = (): JSX.Element => {
	const { loading, payload, error, errorMessage } = useFetch<
		PayloadProps,
		undefined
	>(getAll);

	if (error) {
		return <div>{errorMessage}</div>;
	}

	if (loading || payload === undefined) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	return (
		<ListAlert
			{...{
				allAlertRules: payload,
			}}
		/>
	);
};

export default ListAlertRules;
