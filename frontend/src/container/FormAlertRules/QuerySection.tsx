import './QuerySection.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Tabs, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import PromQLIcon from 'assets/Dashboard/PromQl';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QBShortcuts } from 'constants/shortcuts/QBShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { isEmpty } from 'lodash-es';
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
	hideTitle,
}: QuerySectionProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');
	const [currentTab, setCurrentTab] = useState(queryCategory);
	const [signalSource, setSignalSource] = useState<string>('metrics');

	const handleQueryCategoryChange = (queryType: string): void => {
		setQueryCategory(queryType as EQueryType);
		setCurrentTab(queryType as EQueryType);
	};

	const renderPromqlUI = (): JSX.Element => <PromqlSection />;

	const renderChQueryUI = (): JSX.Element => <ChQuerySection />;

	const isDarkMode = useIsDarkMode();

	const handleSignalSourceChange = (value: string): void => {
		setSignalSource(value);
	};

	const renderMetricUI = (): JSX.Element => (
		<QueryBuilderV2
			panelType={panelType}
			config={{
				queryVariant: 'static',
				initialDataSource: ALERTS_DATA_SOURCE_MAP[alertType],
				signalSource: signalSource === 'meter' ? 'meter' : '',
			}}
			showTraceOperator={alertType === AlertTypes.TRACES_BASED_ALERT}
			showFunctions={
				(alertType === AlertTypes.METRICS_BASED_ALERT &&
					alertDef.version === ENTITY_VERSION_V4) ||
				alertType === AlertTypes.LOGS_BASED_ALERT
			}
			version={alertDef.version || 'v3'}
			onSignalSourceChange={handleSignalSourceChange}
			signalSourceChangeEnabled
		/>
	);

	const tabs = [
		{
			label: (
				<Tooltip title="Query Builder">
					<Button className="nav-btns">
						<Atom size={14} />
						<Typography.Text>Query Builder</Typography.Text>
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
						<Typography.Text>ClickHouse Query</Typography.Text>
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
							<Typography.Text>Query Builder</Typography.Text>
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
							<Typography.Text>ClickHouse Query</Typography.Text>
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
							<Typography.Text>PromQL</Typography.Text>
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
							style={{ width: '100%', padding: '0px 8px' }}
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
												isNewRule: !ruleId || isEmpty(ruleId),
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
							style={{ width: '100%', padding: '0px 8px' }}
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

	const step2Label = alertDef.alertType === 'METRIC_BASED_ALERT' ? '2' : '1';

	return (
		<>
			{!hideTitle && (
				<StepHeading> {t('alert_form_step2', { step: step2Label })}</StepHeading>
			)}
			<FormContainer className="alert-query-section-container">
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
	ruleId: string;
	hideTitle?: boolean;
}

QuerySection.defaultProps = {
	hideTitle: false,
};

export default QuerySection;
