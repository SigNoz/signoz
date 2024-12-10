import './QuerySection.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Tabs, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import PromQLIcon from 'assets/Dashboard/PromQl';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QBShortcuts } from 'constants/shortcuts/QBShortcuts';
import { QueryBuilder } from 'container/QueryBuilder';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Atom, Play, Terminal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';

import ChQuerySection from './ChQuerySection';
import PromqlSection from './PromqlSection';
import { FormContainer, StepHeading } from './styles';

function QuerySection({
	queryCategory,
	setQueryCategory,
	alertType,
	runQuery,
	alertDef,
	panelType,
	ruleId,
}: QuerySectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');
	const [currentTab, setCurrentTab] = useState(queryCategory);

	// TODO[vikrantgupta25] : check if this is still required ??
	const handleQueryCategoryChange = (queryType: string): void => {
		setQueryCategory(queryType as EQueryType);
		setCurrentTab(queryType as EQueryType);
	};

	const renderPromqlUI = (): JSX.Element => <PromqlSection />;

	const renderChQueryUI = (): JSX.Element => <ChQuerySection />;

	const isDarkMode = useIsDarkMode();

	const renderMetricUI = (): JSX.Element => (
		<QueryBuilder
			panelType={panelType}
			config={{
				queryVariant: 'static',
				initialDataSource: ALERTS_DATA_SOURCE_MAP[alertType],
			}}
			showFunctions={
				(alertType === AlertTypes.METRICS_BASED_ALERT &&
					alertDef.version === ENTITY_VERSION_V4) ||
				alertType === AlertTypes.LOGS_BASED_ALERT
			}
			version={alertDef.version || 'v3'}
		/>
	);

	const tabs = [
		{
			label: (
				<Tooltip title="Query Builder">
					<Button className="nav-btns">
						<Atom size={14} />
					</Button>
				</Tooltip>
			),
			key: EQueryType.QUERY_BUILDER,
		},
		{
			label: (
				<Tooltip title="ClickHouse">
					<Button className="nav-btns">
						<Terminal size={14} />
					</Button>
				</Tooltip>
			),
			key: EQueryType.CLICKHOUSE,
		},
	];

	const items = useMemo(
		() => [
			{
				label: (
					<Tooltip title="Query Builder">
						<Button className="nav-btns" data-testid="query-builder-tab">
							<Atom size={14} />
						</Button>
					</Tooltip>
				),
				key: EQueryType.QUERY_BUILDER,
			},
			{
				label: (
					<Tooltip title="ClickHouse">
						<Button className="nav-btns">
							<Terminal size={14} />
						</Button>
					</Tooltip>
				),
				key: EQueryType.CLICKHOUSE,
			},
			{
				label: (
					<Tooltip title="PromQL">
						<Button className="nav-btns">
							<PromQLIcon
								fillColor={isDarkMode ? Color.BG_VANILLA_200 : Color.BG_INK_300}
							/>
						</Button>
					</Tooltip>
				),
				key: EQueryType.PROM,
			},
		],
		[isDarkMode],
	);

	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	useEffect(() => {
		registerShortcut(QBShortcuts.StageAndRunQuery, runQuery);

		return (): void => {
			deregisterShortcut(QBShortcuts.StageAndRunQuery);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [runQuery]);

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
										onClick={(): void => {
											runQuery();
											logEvent('Alert: Stage and run query', {
												dataSource: ALERTS_DATA_SOURCE_MAP[alertType],
												isNewRule: !ruleId || ruleId === 0,
												ruleId,
												queryType: queryCategory,
											});
										}}
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
			<StepHeading> {t('alert_form_step2')}</StepHeading>
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
	alertDef: AlertDef;
	panelType: PANEL_TYPES;
	ruleId: number;
}

export default QuerySection;
