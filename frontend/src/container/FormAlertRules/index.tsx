import { SaveOutlined } from '@ant-design/icons';
import { Form, FormInstance, message, notification } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import saveAlertApi from 'api/alerts/save';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback, useEffect, useState } from 'react';
import {
	IFormulaQueries,
	IMetricQueries,
	IPromQueries,
} from 'types/api/alerts/compositeQuery';
import { AlertDef } from 'types/api/alerts/def';

import BasicInfo from './BasicInfo';
import QuerySection from './QuerySection';
import RuleOptions from './RuleOptions';
import { ActionButton, ButtonContainer } from './styles';
import { PROMQL, QUERY_BUILDER, QueryType } from './types';
import {
	prepareBuilderQueries,
	toFormulaQueries,
	toMetricQueries,
} from './utils';

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
		initialValue?.condition?.compositeMetricQuery?.queryType as QueryType,
	);

	// local state to handle metric queries
	const [metricQueries, setMetricQueries] = useState<IMetricQueries>(
		toMetricQueries(
			initialValue?.condition?.compositeMetricQuery?.builderQueries,
		),
	);

	// local state to handle formula queries
	const [formulaQueries, setFormulaQueries] = useState<IFormulaQueries>(
		toFormulaQueries(
			initialValue?.condition?.compositeMetricQuery?.builderQueries,
		),
	);

	// local state to handle promql queries
	const [promQueries, setPromQueries] = useState<IPromQueries>({
		...initialValue?.condition?.compositeMetricQuery?.promQueries,
	});

	useEffect(() => {
		setQueryCategory(
			initialValue?.condition?.compositeMetricQuery?.queryType as QueryType,
		);
		setMetricQueries(
			toMetricQueries(
				initialValue?.condition?.compositeMetricQuery?.builderQueries,
			),
		);
		setFormulaQueries(
			toFormulaQueries(
				initialValue?.condition?.compositeMetricQuery?.builderQueries,
			),
		);
		setPromQueries({
			...initialValue?.condition?.compositeMetricQuery?.promQueries,
		});
	}, [initialValue]);

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
				description: 'at least one metric condition is required',
			});
			return false;
		}

		Object.keys(metricQueries).forEach((key) => {
			if (metricQueries[key].metricName === '') {
				retval = false;
				notification.error({
					message: 'Error',
					description: `metric name is missing in ${metricQueries[key].name}`,
				});
			}
		});

		Object.keys(formulaQueries).forEach((key) => {
			if (formulaQueries[key].expression === '') {
				retval = false;
				notification.error({
					message: 'Error',
					description: `expression is missing in ${formulaQueries[key].name}`,
				});
			}
		});

		return retval;
	}, [alertDef, queryCategory, metricQueries, formulaQueries, promQueries]);

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
					builderQueries: prepareBuilderQueries(metricQueries, formulaQueries),
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
		formulaQueries,
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
						formulaQueries={formulaQueries}
						setFormulaQueries={setFormulaQueries}
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
