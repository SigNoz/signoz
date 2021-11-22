import get from 'api/alerts/get';
import Spinner from 'components/Spinner';
import EditRulesContainer from 'container/EditRules';
import useFetch from 'hooks/useFetch';
import React, { useCallback, useRef } from 'react';
import { useParams } from 'react-router';
import { PayloadProps, Props } from 'types/api/alerts/get';

const EditRules = () => {
	const { ruleId } = useParams<EditRulesParam>();

	const { loading, error, payload, errorMessage } = useFetch<
		PayloadProps,
		Props
	>(get, {
		id: parseInt(ruleId),
	});

	if (loading || payload === undefined) {
		return <Spinner tip="Loading Rules..." />;
	}

	if (error) {
		return <div>{errorMessage}</div>;
	}

	return <EditRulesContainer ruleId={ruleId} initialData={payload.data} />;
};

interface EditRulesParam {
	ruleId: string;
}

export default EditRules;
