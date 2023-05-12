import { Button, Tabs } from 'antd';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilder } from 'container/QueryBuilder';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { IChQueries, IPromQueries } from 'types/api/alerts/compositeQuery';
import { EQueryType } from 'types/common/dashboard';

import ChQuerySection from './ChQuerySection';
import PromqlSection from './PromqlSection';
import { FormContainer, StepHeading } from './styles';

function QuerySection({
	queryCategory,
	setQueryCategory,
	promQueries,
	setPromQueries,
	chQueries,
	setChQueries,
	alertType,
	runQuery,
}: QuerySectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const handleQueryCategoryChange = (queryType: string): void => {
		if (
			queryType === EQueryType.PROM &&
			(!promQueries || Object.keys(promQueries).length === 0)
		) {
			setPromQueries({
				A: {
					query: '',
					stats: '',
					name: 'A',
					legend: '',
					disabled: false,
				},
			});
		}

		if (
			queryType === EQueryType.CLICKHOUSE &&
			(!chQueries || Object.keys(chQueries).length === 0)
		) {
			setChQueries({
				A: {
					rawQuery: '',
					name: 'A',
					query: '',
					legend: '',
					disabled: false,
				},
			});
		}
		setQueryCategory(queryType as EQueryType);
	};

	const renderPromqlUI = (): JSX.Element => (
		<PromqlSection promQueries={promQueries} setPromQueries={setPromQueries} />
	);

	const renderChQueryUI = (): JSX.Element => (
		<ChQuerySection chQueries={chQueries} setChQueries={setChQueries} />
	);

	const renderMetricUI = (): JSX.Element => (
		<QueryBuilder
			panelType={PANEL_TYPES.TIME_SERIES}
			config={{
				queryVariant: 'static',
				initialDataSource: ALERTS_DATA_SOURCE_MAP[alertType],
			}}
		/>
	);

	const handleRunQuery = (): void => {
		runQuery();
	};

	const tabs = [
		{
			label: t('tab_qb'),
			key: EQueryType.QUERY_BUILDER,
		},
		{
			label: t('tab_chquery'),
			key: EQueryType.CLICKHOUSE,
		},
	];

	const items = [
		{ label: t('tab_qb'), key: EQueryType.QUERY_BUILDER },
		{ label: t('tab_chquery'), key: EQueryType.CLICKHOUSE },
		{ label: t('tab_promql'), key: EQueryType.PROM },
	];

	const renderTabs = (typ: AlertTypes): JSX.Element | null => {
		switch (typ) {
			case AlertTypes.TRACES_BASED_ALERT:
			case AlertTypes.LOGS_BASED_ALERT:
			case AlertTypes.EXCEPTIONS_BASED_ALERT:
				return (
					<Tabs
						type="card"
						style={{ width: '100%' }}
						defaultActiveKey={EQueryType.QUERY_BUILDER}
						activeKey={queryCategory}
						onChange={handleQueryCategoryChange}
						tabBarExtraContent={
							<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
								<Button type="primary" onClick={handleRunQuery}>
									Run Query
								</Button>
							</span>
						}
						items={tabs}
					/>
				);
			case AlertTypes.METRICS_BASED_ALERT:
			default:
				return (
					<Tabs
						type="card"
						style={{ width: '100%' }}
						defaultActiveKey={EQueryType.QUERY_BUILDER}
						activeKey={queryCategory}
						onChange={handleQueryCategoryChange}
						tabBarExtraContent={
							<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
								<Button type="primary" onClick={handleRunQuery}>
									Run Query
								</Button>
							</span>
						}
						items={items}
					/>
				);
		}
	};
	const renderQuerySection = (c: EQueryType): JSX.Element | null => {
		switch (c) {
			case EQueryType.PROM:
				return renderPromqlUI();
			case EQueryType.CLICKHOUSE:
				return renderChQueryUI();
			case EQueryType.QUERY_BUILDER:
				return renderMetricUI();
			default:
				return null;
		}
	};
	return (
		<>
			<StepHeading> {t('alert_form_step1')}</StepHeading>
			<FormContainer>
				<div style={{ display: 'flex' }}>{renderTabs(alertType)}</div>
				{renderQuerySection(queryCategory)}
			</FormContainer>
		</>
	);
}

interface QuerySectionProps {
	queryCategory: EQueryType;
	setQueryCategory: (n: EQueryType) => void;
	promQueries: IPromQueries;
	setPromQueries: (p: IPromQueries) => void;
	chQueries: IChQueries;
	setChQueries: (q: IChQueries) => void;
	alertType: AlertTypes;
	runQuery: () => void;
}

export default QuerySection;
