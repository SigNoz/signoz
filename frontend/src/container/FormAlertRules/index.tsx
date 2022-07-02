import { SaveOutlined } from '@ant-design/icons';
import { Form, FormInstance, notification } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import saveAlertApi from 'api/alerts/save';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';
import { AlertDef } from 'types/api/alerts/def';
import { BuilderQueries, PromQueries } from 'types/api/metrics/compositeQuery';

import BasicInfo from './BasicInfo';
import QuerySection from './QuerySection';
import RuleOptions from './RuleOptions';
import { ActionButton, ButtonContainer } from './styles';
import { PROMQL, QUERY_BUILDER, QueryType } from './types';

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

	const onCancelHandler = useCallback(async () => {
		history.replace(ROUTES.LIST_ALL_ALERT);
	}, []);

	const isFormValid = useCallback((): boolean => {
		let retval = true;

		if (!alertDef.alert || alertDef.alert === '') {
			notification.error({
				message: 'Error',
				description: 'alert name is required',
			});
			return false;
		}

		if (
			queryCategory === PROMQL &&
			(!promQueries || Object.keys(promQueries).length === 0)
		) {
			notification.error({
				message: 'Error',
				description:
					'promql expression is required when query format is set to PromQL',
			});
			return false;
		}

		if (
			(queryCategory === QUERY_BUILDER && !metricQueries) ||
			Object.keys(metricQueries).length === 0
		) {
			notification.error({
				message: 'Error',
				description:
					'metric name must be set when query format is set to Query Builder',
			});
			return false;
		}

		Object.keys(metricQueries).forEach((key) => {
			if (metricQueries[key].metricName === '') {
				retval = false;
				notification.error({
					message: 'Error',
					description:
						'metric name must be set when query format is set to Query Builder',
				});
			}
		});

		return retval;
	}, [alertDef, queryCategory, metricQueries, promQueries]);

	const onSaveHandler = useCallback(async () => {
		if (!isFormValid()) {
			return;
		}

		const postableAlert: AlertDef = {
			...alertDef,
			ruleType: queryCategory === PROMQL ? 'promql_rule' : 'threshold_rule',
			condition: {
				...alertDef.condition,
				compositeMetricQuery: {
					builderQueries: metricQueries,
					promQueries,
					queryType: queryCategory,
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
				description:
					!ruleId || ruleId === 0
						? 'Rule created successfully'
						: 'Rule edited successfully',
			});
			setTimeout(() => {
				history.replace(ROUTES.LIST_ALL_ALERT);
			}, 2000);
		} else {
			notifications.error({
				message: 'Error',
				description: response.error || 'failed to create or edit rule',
			});
		}
		setLoading(false);
	}, [
		isFormValid,
		queryCategory,
		ruleId,
		notifications,
		alertDef,
		metricQueries,
		promQueries,
	]);

	const renderBasicInfo = (): JSX.Element => (
		<BasicInfo
			queryCategory={queryCategory}
			alertDef={alertDef}
			setAlertDef={setAlertDef}
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
				{queryCategory !== PROMQL && (
					<RuleOptions initialValue={alertDef} setAlertDef={setAlertDef} />
				)}
				{renderBasicInfo()}
				<ButtonContainer>
					<ActionButton
						loading={loading || false}
						type="primary"
						onClick={onSaveHandler}
						icon={<SaveOutlined />}
					>
						{ruleId > 0 ? 'Save Changes' : 'Create Rule'}
					</ActionButton>
					<ActionButton
						loading={loading || false}
						type="default"
						onClick={onCancelHandler}
					>
						{ruleId > 0 ? 'Return to rules' : 'Cancel'}
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
