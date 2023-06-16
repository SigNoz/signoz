import { Form, Row } from 'antd';
import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import FormAlertRules from 'container/FormAlertRules';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useState } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import {
	alertDefaults,
	ALERTS_VALUES_MAP,
	exceptionAlertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from './defaults';
import SelectAlertType from './SelectAlertType';

function CreateRules(): JSX.Element {
	const [initValues, setInitValues] = useState<AlertDef>(alertDefaults);
	const [alertType, setAlertType] = useState<AlertTypes>(
		AlertTypes.METRICS_BASED_ALERT,
	);
	const [formInstance] = Form.useForm();

	const urlQuery = useUrlQuery();

	const compositeQuery = urlQuery.get(COMPOSITE_QUERY);

	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const onSelectType = (typ: AlertTypes): void => {
		setAlertType(typ);
		switch (typ) {
			case AlertTypes.LOGS_BASED_ALERT:
				setInitValues(logAlertDefaults);
				break;
			case AlertTypes.TRACES_BASED_ALERT:
				setInitValues(traceAlertDefaults);
				break;
			case AlertTypes.EXCEPTIONS_BASED_ALERT:
				setInitValues(exceptionAlertDefaults);
				break;
			default:
				setInitValues(alertDefaults);
		}

		const value = ALERTS_VALUES_MAP[typ].condition.compositeQuery;

		const compositeQuery = mapQueryDataFromApi(value);

		redirectWithQueryBuilderData(compositeQuery);
	};

	if (!compositeQuery) {
		return (
			<Row wrap={false}>
				<SelectAlertType onSelect={onSelectType} />
			</Row>
		);
	}

	return (
		<FormAlertRules
			alertType={alertType}
			formInstance={formInstance}
			initialValue={initValues}
			ruleId={0}
		/>
	);
}

export default CreateRules;
