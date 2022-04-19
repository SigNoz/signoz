import get from 'api/alerts/get';
import Spinner from 'components/Spinner';
import EditRulesContainer from 'container/EditRules';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';

function EditRules(): JSX.Element {
	const { ruleId } = useParams<EditRulesParam>();
	const { t } = useTranslation('common');

	const { isLoading, data, isError } = useQuery(['ruleId', ruleId], {
		queryFn: () =>
			get({
				id: parseInt(ruleId, 10),
			}),
	});

	if (isError) {
		return <div>{data?.error || t('something_went_wrong')}</div>;
	}

	if (isLoading || !data?.payload) {
		return <Spinner tip="Loading Rules..." />;
	}

	return <EditRulesContainer ruleId={ruleId} initialData={data.payload.data} />;
}

interface EditRulesParam {
	ruleId: string;
}

export default EditRules;
