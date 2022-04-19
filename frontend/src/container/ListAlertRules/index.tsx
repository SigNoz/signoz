import getAll from 'api/alerts/getAll';
import Spinner from 'components/Spinner';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

import ListAlert from './ListAlert';

function ListAlertRules(): JSX.Element {
	const { t } = useTranslation('common');
	const { data, isError, isLoading } = useQuery('allAlerts', {
		queryFn: getAll,
	});

	if (isError) {
		return <div>{data?.error || t('something_went_wrong')}</div>;
	}

	if (isLoading || !data?.payload) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	return (
		<ListAlert
			{...{
				allAlertRules: data.payload,
			}}
		/>
	);
}

export default ListAlertRules;
