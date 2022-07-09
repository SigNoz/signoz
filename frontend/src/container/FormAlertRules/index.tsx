import { SaveOutlined } from '@ant-design/icons';
import { Form, FormInstance, notification } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import saveAlertApi from 'api/alerts/save';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
	IFormulaQueries,
	IMetricQueries,
	IPromQueries,
} from 'types/api/alerts/compositeQuery';
import { AlertDef } from 'types/api/alerts/def';
import { Query as StagedQuery } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { resolveQueryCategoryName } from 'types/api/alerts/queryType';
import BasicInfo from './BasicInfo';
import ChartPreview from './ChartPreview';
import QuerySection from './QuerySection';
import RuleOptions from './RuleOptions';
import { ActionButton, ButtonContainer, MainFormContainer } from './styles';
import {
	prepareBuilderQueries,
	toFormulaQueries,
	toMetricQueries,
	prepareStagedQuery,
} from './utils';

function FormAlertRules({
	formInstance,
	initialValue,
	ruleId,
}: FormAlertRuleProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');

	const [loading, setLoading] = useState(false);

	// alertDef holds the form values to be posted
	const [alertDef, setAlertDef] = useState<AlertDef>(initialValue);

	// initQuery contains initial query when component was mounted
	const initQuery = initialValue?.condition?.compositeMetricQuery;

	const [queryCategory, setQueryCategory] = useState<EQueryType>(
		initQuery?.queryType as EQueryType,
	);

	// local state to handle metric queries
	const [metricQueries, setMetricQueries] = useState<IMetricQueries>(
		toMetricQueries(initQuery?.builderQueries),
	);

	// local state to handle formula queries
	const [formulaQueries, setFormulaQueries] = useState<IFormulaQueries>(
		toFormulaQueries(initQuery?.builderQueries),
	);

	// local state to handle promql queries
	const [promQueries, setPromQueries] = useState<IPromQueries>({
		...initQuery?.promQueries,
	});

	// staged query is used to display chart preview
	const [stagedQuery, setStagedQuery] = useState<StagedQuery>();

	// set when query setup changes, user hasnt staged the changes
	const [queryChanged, setQueryChanged] = useState<boolean>(false);

	useEffect(() => {
		setQueryChanged(true);
	}, [metricQueries, promQueries, formulaQueries]);

	// this use effect initiates staged query and
	// other queries based on server data.
	// useful when fetching of initial values (from api)
	// is delayed
	useEffect(() => {
		const t = initQuery?.queryType as EQueryType;

		// extract metric query from builderQueries
		const mq = toMetricQueries(initQuery?.builderQueries);

		// extract formula query from builderQueries
		const fq = toFormulaQueries(initQuery?.builderQueries);

		// prepare staged query
		const sq = prepareStagedQuery(
			initQuery.queryType,
			mq,
			fq,
			initQuery?.promQueries,
		);
		const pq = initQuery?.promQueries;

		setQueryCategory(t);
		setMetricQueries(mq);
		setFormulaQueries(fq);
		setPromQueries(pq);
		setStagedQuery(sq);
	}, [initQuery]);

	// this useEffect updates staging query when
	// any of its sub-parameters changes
	useEffect(() => {
		// prepare staged query
		const sq: StagedQuery = prepareStagedQuery(
			queryCategory,
			metricQueries,
			formulaQueries,
			promQueries,
		);
		setStagedQuery(sq);
	}, [queryCategory, metricQueries, formulaQueries, promQueries]);

	const onCancelHandler = useCallback(() => {
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
			queryCategory === EQueryType.PROM &&
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
			(queryCategory === EQueryType.QUERY_BUILDER && !metricQueries) ||
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
			ruleType:
				queryCategory === EQueryType.PROM ? 'promql_rule' : 'threshold_rule',
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
			notification.success({
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
			notification.error({
				message: 'Error',
				description: response.error || 'failed to create or edit rule',
			});
		}
		setLoading(false);
	}, [
		isFormValid,
		queryCategory,
		ruleId,
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

	const renderQBChartPreview = (): JSX.Element => {
		return (
			<ChartPreview name="Chart Preview (Query Builder)" query={stagedQuery} />
		);
	};

	const renderPromChartPreview = (): JSX.Element => {
		return <ChartPreview name="Chart Preview (PromQL)" query={stagedQuery} />;
	};

	return (
		<>
			{Element}
			<MainFormContainer
				initialValues={initialValue}
				layout="vertical"
				form={formInstance}
			>
				{queryCategory === EQueryType.QUERY_BUILDER && renderQBChartPreview()}
				{queryCategory === EQueryType.PROM && renderPromChartPreview()}
				<FormItem labelAlign="left" name="query">
					<QuerySection
						queryChanged={queryChanged}
						queryCategory={queryCategory}
						setQueryCategory={setQueryCategory}
						metricQueries={metricQueries}
						setMetricQueries={setMetricQueries}
						formulaQueries={formulaQueries}
						setFormulaQueries={setFormulaQueries}
						promQueries={promQueries}
						setPromQueries={setPromQueries}
						stagedQuery={stagedQuery}
						setStagedQuery={setStagedQuery}
					/>
				</FormItem>
				{queryCategory !== EQueryType.PROM && (
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
						{ruleId > 0 ? t('button_savechanges') : t('button_createrule')}
					</ActionButton>
					<ActionButton
						loading={loading || false}
						type="default"
						onClick={onCancelHandler}
					>
						{ruleId > 0 ? t('button_returntorules') : t('button_cancelchanges')}
					</ActionButton>
				</ButtonContainer>
			</MainFormContainer>
		</>
	);
}

interface FormAlertRuleProps {
	formInstance: FormInstance;
	initialValue: AlertDef;
	ruleId: number;
}

export default FormAlertRules;
