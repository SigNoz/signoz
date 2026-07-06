import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useMemo,
} from 'react';
import { Color } from '@signozhq/design-tokens';
import { Atom, Terminal } from '@signozhq/icons';
import { Tabs } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import PromQLIcon from 'assets/Dashboard/PromQl';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import TextToolTip from 'components/TextToolTip';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ClickHouseQueryContainer from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/ClickHouse';
import PromQLQueryContainer from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { EQueryType } from 'types/common/dashboard';

import {
	getHiddenQueryBuilderFields,
	getSupportedQueryTypes,
} from '../../Panels/capabilities';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from '../../Panels/types/panelKind';

import styles from './PanelEditorQueryBuilder.module.scss';

interface PanelEditorQueryBuilderProps {
	/** The edited panel's visualization kind — drives supported query types + field visibility via the capabilities guard. */
	panelKind: PanelKind;
	/** The panel's current signal; selects per-signal query-builder field rules. */
	signal: TelemetrytypesSignalDTO;
	/** Preview fetch in flight — drives the Stage & Run button's loading/cancel state. */
	isLoadingQueries: boolean;
	/** Run the current query (Stage & Run button / ⌘↵). Always re-runs. */
	onStageRunQuery: () => void;
	/** Abort the in-flight preview fetch (the button's cancel action). */
	onCancelQuery: () => void;
	/** Optional content pinned below the builder (e.g. the List columns editor). */
	footer?: ReactNode;
}

/**
 * Builder UI for the V2 panel editor's left pane: queryType tabs (Query Builder /
 * ClickHouse / PromQL) plus the Stage & Run button, all reading/writing the global
 * `QueryBuilderProvider`. `usePanelEditorQuerySync` owns the panel↔provider sync.
 */
function PanelEditorQueryBuilder({
	panelKind,
	signal,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
	footer,
}: PanelEditorQueryBuilderProps): JSX.Element {
	// The shared QueryBuilderV2 / list-view checks still speak the legacy PANEL_TYPES.
	const panelType = PANEL_KIND_TO_PANEL_TYPE[panelKind];
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const isDarkMode = useIsDarkMode();

	const handleQueryCategoryChange = useCallback(
		(queryType: string): void => {
			redirectWithQueryBuilderData({
				...currentQuery,
				queryType: queryType as EQueryType,
			});
		},
		[currentQuery, redirectWithQueryBuilderData],
	);

	// ⌘↵ / Ctrl+↵ stages and runs the query. Handled locally because the global
	// hotkeys provider ignores keydowns from inputs / the query editor, and on the
	// capture phase so it still fires for fields that stop bubbling (filter search,
	// CodeMirror).
	const handleKeyDownCapture = useCallback(
		(event: KeyboardEvent<HTMLDivElement>): void => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
				event.preventDefault();
				onStageRunQuery();
			}
		},
		[onStageRunQuery],
	);

	// Per-kind query-builder field rules from the guard (e.g. List hides step interval
	// and having), passed to QueryBuilderV2 as its `filterConfigs`.
	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(
		() => getHiddenQueryBuilderFields(panelKind, signal),
		[panelKind, signal],
	);

	const items = useMemo(() => {
		const supportedQueryTypes = getSupportedQueryTypes(panelKind);

		const queryTypeComponents = {
			[EQueryType.QUERY_BUILDER]: {
				icon: <Atom size={14} />,
				label: 'Query Builder',
				component: (
					<div className="query-builder-v2-container">
						<QueryBuilderV2
							panelType={panelType}
							filterConfigs={filterConfigs}
							showTraceOperator={panelType !== PANEL_TYPES.LIST}
							version="v3"
							isListViewPanel={panelType === PANEL_TYPES.LIST}
							queryComponents={{}}
							signalSourceChangeEnabled
							savePreviousQuery
						/>
					</div>
				),
			},
			[EQueryType.CLICKHOUSE]: {
				icon: <Terminal size={14} />,
				label: 'ClickHouse Query',
				component: <ClickHouseQueryContainer />,
			},
			[EQueryType.PROM]: {
				icon: (
					<PromQLIcon
						fillColor={isDarkMode ? Color.BG_VANILLA_200 : Color.BG_INK_300}
					/>
				),
				label: 'PromQL',
				component: <PromQLQueryContainer />,
			},
		};

		return supportedQueryTypes.map((queryType) => ({
			key: queryType,
			label: (
				<div className={styles.queryTypeTab}>
					{queryTypeComponents[queryType].icon}
					<Typography>{queryTypeComponents[queryType].label}</Typography>
				</div>
			),
			children: queryTypeComponents[queryType].component,
		}));
	}, [panelKind, panelType, filterConfigs, isDarkMode]);

	return (
		<div
			className={styles.container}
			data-testid="panel-editor-v2-query-builder"
			onKeyDownCapture={handleKeyDownCapture}
			role="presentation"
		>
			<div className={styles.scrollArea}>
				<Tabs
					type="card"
					className={styles.tabsContainer}
					activeKey={currentQuery.queryType}
					onChange={handleQueryCategoryChange}
					tabBarExtraContent={
						<span className={styles.runQueryBtnContainer}>
							<TextToolTip text="This will temporarily save the current query and graph state. This will persist across tab change" />
							<RunQueryBtn
								className="run-query-dashboard-btn"
								label="Run Query"
								onStageRunQuery={onStageRunQuery}
								isLoadingQueries={isLoadingQueries}
								handleCancelQuery={onCancelQuery}
							/>
						</span>
					}
					items={items}
				/>
			</div>
			{footer}
		</div>
	);
}

export default PanelEditorQueryBuilder;
