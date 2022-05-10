import getAll from 'api/alerts/getAll';
import Spinner from 'components/Spinner';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

import ListAlert from './ListAlert';

function ListAlertRules(): JSX.Element {
	const { t } = useTranslation('common');
	const { data, isError, isLoading, refetch, status } = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
	});

	// api failed to load the data
	if (isError) {
		return <div>{data?.error || t('something_went_wrong')}</div>;
	}

	// api is successful but error is present
	if (status === 'success' && data.statusCode !== 200) {
		return <div>{data?.error || t('something_went_wrong')}</div>;
	}

	// in case of loading
	if (isLoading || !data?.payload) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	return (
		<ListAlert
			{...{
				allAlertRules: data.payload,
				refetch,
			}}
		/>
	);
}

export default ListAlertRules;
