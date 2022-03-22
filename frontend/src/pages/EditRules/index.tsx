import get from 'api/alerts/get';
import Spinner from 'components/Spinner';
import EditRulesContainer from 'container/EditRules';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { useParams } from 'react-router';
import { PayloadProps, Props } from 'types/api/alerts/get';

function EditRules(): JSX.Element {
	const { ruleId } = useParams<EditRulesParam>();

	const { loading, error, payload, errorMessage } = useFetch<
		PayloadProps,
		Props
	>(get, {
		id: parseInt(ruleId),
	});

	if (error) {
		return <div>{errorMessage}</div>;
	}

	if (loading || payload === undefined) {
		return <Spinner tip="Loading Rules..." />;
	}

	return <EditRulesContainer ruleId={ruleId} initialData={payload.data} />;
}

interface EditRulesParam {
	ruleId: string;
}

export default EditRules;
