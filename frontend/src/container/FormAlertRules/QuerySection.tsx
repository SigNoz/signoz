import './QuerySection.styles.scss';

import { Button, Tabs } from 'antd';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilder } from 'container/QueryBuilder';
import { Atom, LucideAccessibility, Play, Terminal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { EQueryType } from 'types/common/dashboard';
import AppReducer from 'types/reducer/app';

import ChQuerySection from './ChQuerySection';
import PromqlSection from './PromqlSection';
import { FormContainer, StepHeading } from './styles';

function QuerySection({
	queryCategory,
	setQueryCategory,
	alertType,
	runQuery,
}: QuerySectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');
	const [currentTab, setCurrentTab] = useState(queryCategory);

	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const handleQueryCategoryChange = (queryType: string): void => {
		featureResponse.refetch().then(() => {
			setQueryCategory(queryType as EQueryType);
		});
		setCurrentTab(queryType as EQueryType);
	};

	const renderPromqlUI = (): JSX.Element => <PromqlSection />;

	const renderChQueryUI = (): JSX.Element => <ChQuerySection />;

	const renderMetricUI = (): JSX.Element => (
		<QueryBuilder
			panelType={PANEL_TYPES.TIME_SERIES}
			config={{
				queryVariant: 'static',
				initialDataSource: ALERTS_DATA_SOURCE_MAP[alertType],
			}}
		/>
	);

	const tabs = [
		{
			label: (
				<Button className="nav-btns">
					<Atom size={14} />
				</Button>
			),
			key: EQueryType.QUERY_BUILDER,
		},
		{
			label: (
				<Button className="nav-btns">
					<Terminal size={14} />
				</Button>
			),
			key: EQueryType.CLICKHOUSE,
		},
	];

	const items = useMemo(
		() => [
			{
				label: (
					<Button className="nav-btns">
						<Atom size={14} />
					</Button>
				),
				key: EQueryType.QUERY_BUILDER,
			},
			{
				label: (
					<Button className="nav-btns">
						<Terminal size={14} />
					</Button>
				),
				key: EQueryType.CLICKHOUSE,
			},
			{
				label: (
					<Button className="nav-btns">
						<LucideAccessibility size={14} />
					</Button>
				),
				key: EQueryType.PROM,
			},
		],
		[],
	);

	const renderTabs = (typ: AlertTypes): JSX.Element | null => {
		switch (typ) {
			case AlertTypes.TRACES_BASED_ALERT:
			case AlertTypes.LOGS_BASED_ALERT:
			case AlertTypes.EXCEPTIONS_BASED_ALERT:
				return (
					<div className="alert-tabs">
						<Tabs
							type="card"
							style={{ width: '100%' }}
							defaultActiveKey={currentTab}
							activeKey={currentTab}
							onChange={handleQueryCategoryChange}
							tabBarExtraContent={
								<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
									<Button
										type="primary"
										onClick={runQuery}
										className="stage-run-query"
										icon={<Play size={14} />}
									>
										Stage & Run Query
									</Button>
								</span>
							}
							items={tabs}
						/>
					</div>
				);
			case AlertTypes.METRICS_BASED_ALERT:
			default:
				return (
					<div className="alert-tabs">
						<Tabs
							type="card"
							style={{ width: '100%' }}
							defaultActiveKey={currentTab}
							activeKey={currentTab}
							onChange={handleQueryCategoryChange}
							tabBarExtraContent={
								<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
									<Button
										type="primary"
										onClick={runQuery}
										className="stage-run-query"
										icon={<Play size={14} />}
									>
										Stage & Run Query
									</Button>
								</span>
							}
							items={items}
						/>
					</div>
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
				<div>{renderTabs(alertType)}</div>
				{renderQuerySection(currentTab)}
			</FormContainer>
		</>
	);
}

interface QuerySectionProps {
	queryCategory: EQueryType;
	setQueryCategory: (n: EQueryType) => void;
	alertType: AlertTypes;
	runQuery: VoidFunction;
}

export default QuerySection;
