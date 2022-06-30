import { SaveOutlined } from '@ant-design/icons';
import { Form, FormInstance, notification } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import saveAlertApi from 'api/alerts/save';
import React, { useCallback, useState } from 'react';
import { AlertDef } from 'types/api/alerts/def';
import { BuilderQueries, PromQueries } from 'types/api/metrics/compositeQuery';

import BasicInfo from './BasicInfo';
import QuerySection from './QuerySection';
import RuleOptions from './RuleOptions';
import { ActionButton, ButtonContainer } from './styles';
import { QueryType } from './types';

function FormAlertRules({
	formInstance,
	initialValue,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	console.log('FormAlertRules:', initialValue);
	console.log('FormAlertRules:', ruleId);
	const [notifications, Element] = notification.useNotification();

	const [loading, setLoading] = useState(false);

	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);

	const [queryCategory, setQueryCategory] = useState<QueryType>(
		alertDef?.condition?.compositeMetricQuery?.queryType as QueryType,
	);

	// local state to handle metric queries
	const [metricQueries, setMetricQueries] = useState<BuilderQueries>({
		...alertDef?.condition?.compositeMetricQuery?.builderQueries,
	});

	// local state to handle promql queries
	const [promQueries, setPromQueries] = useState<PromQueries>({
		...alertDef?.condition?.compositeMetricQuery?.promQueries,
	});

	const onSaveHandler = useCallback(async () => {
		const qType = Object.keys(metricQueries).length > 0 ? 0 : 2;
		const postableAlert: AlertDef = {
			...alertDef,
			condition: {
				...alertDef.condition,
				compositeMetricQuery: {
					builderQueries: metricQueries,
					promQueries,
					queryType: qType,
				},
			},
		};
		console.log(' postableAlert :', postableAlert);
		setLoading(true);
		const apiReq =
			ruleId && ruleId > 0
				? { data: postableAlert, id: ruleId }
				: { data: postableAlert };
		console.log(' ruleId :', ruleId);
		const response = await saveAlertApi(apiReq);

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: 'Rule edited successfully',
			});

			// setTimeout(() => {
			//	history.replace(ROUTES.SETTINGS);
			//}, 2000);
		} else {
			notifications.error({
				message: 'Error',
				description: response.error || 'failed to create or edit rule',
			});
		}
		setLoading(false);
	}, [ruleId, notifications, alertDef, metricQueries, promQueries]);

	const renderBasicInfo = (): JSX.Element => (
		<BasicInfo
			queryCategory={queryCategory}
			alertDef={alertDef}
			setAlertDef={setAlertDef}
			notifications={notifications}
		/>
	);

	return (
		<>
			{Element}
			<Form initialValues={initialValue} layout="vertical" form={formInstance}>
				<FormItem labelAlign="left" name="query">
					<QuerySection
						metricQueries={metricQueries}
						setMetricQueries={setMetricQueries}
						promQueries={promQueries}
						setPromQueries={setPromQueries}
						queryCategory={queryCategory}
						setQueryCategory={setQueryCategory}
						allowCategoryChange={!(ruleId > 0)}
					/>
				</FormItem>
				<RuleOptions
					initialValue={alertDef}
					setAlertDef={setAlertDef}
					ruleType={queryCategory === 2 ? 'prom_rule' : 'threshold_rule'}
				/>
				{renderBasicInfo()}
				<ButtonContainer>
					<ActionButton
						loading={loading || false}
						type="primary"
						onClick={onSaveHandler}
						icon={<SaveOutlined />}
					>
						Save Alert
					</ActionButton>
					<ActionButton
						loading={loading || false}
						type="default"
						onClick={(e): void => console.log('do nothing')}
					>
						Cancel
					</ActionButton>
				</ButtonContainer>
			</Form>
		</>
	);
}

interface FormAlertRuleProps {
	formInstance: FormInstance;
	initialValue: AlertDef;
	ruleId: number;
}

export default FormAlertRules;
