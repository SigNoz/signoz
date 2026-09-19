import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useMemo,
} from 'react';
import { Color } from '@signozhq/design-tokens';
import { Atom, Sparkles, Terminal } from '@signozhq/icons';
import { Tabs } from 'antd';
import cx from 'classnames';
import { Typography } from '@signozhq/ui/typography';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import PromQLIcon from 'assets/Dashboard/PromQl';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import TextToolTip from 'components/TextToolTip';
import ClickHouseQueryContainer from 'container/QueryBuilder/rawQueryEditors/ClickHouse';
import PromQLQueryContainer from 'container/QueryBuilder/rawQueryEditors/PromQL';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsAIObservabilityEnabled } from 'hooks/useIsAIObservabilityEnabled';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { mergeQueryBuilderFieldRule } from '../../Panels/types/panelCapabilities';
import {
	AI_QUERY_MODE,
	listQueryModes,
	type PanelQueryMode,
} from '../../Panels/types/queryModes';
import type { RenderableQueryPanelDefinition } from '../../Panels/types/panelDefinition';
import { toPanelType } from '../../Panels/types/panelKind';
import { getQueryMode, withQueryMode } from '../../Panels/utils/queryMode';

import styles from './PanelEditorQueryBuilder.module.scss';

interface PanelEditorQueryBuilderProps {
	/** The edited kind's definition — drives supported query types + field visibility. */
	panelDefinition: RenderableQueryPanelDefinition;
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
	/** Pin the tabs + Run Query row to the top of the scroll area. Off in the View modal, which shares a scroll area with its own header. */
	stickyHeader?: boolean;
}

/**
 * Builder UI for the V2 panel editor's left pane: queryType tabs (Query Builder /
 * ClickHouse / PromQL) plus the Stage & Run button, all reading/writing the global
 * `QueryBuilderProvider`. `usePanelEditorQuerySync` owns the panel↔provider sync.
 */
function PanelEditorQueryBuilder({
	panelDefinition,
	signal,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
	footer,
	stickyHeader = true,
}: PanelEditorQueryBuilderProps): JSX.Element {
	// The shared QueryBuilderV2 provider still speaks the legacy PANEL_TYPES; what the
	// builder offers for this kind comes from the kind's own declaration.
	const panelType = toPanelType(panelDefinition.kind);
	// Raw rows: the builder drops its aggregation controls, and with them the trace
	// operator that combines aggregated trace queries (V1 parity).
	const isListViewPanel = panelDefinition.kind === 'signoz/ListPanel';
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const isDarkMode = useIsDarkMode();
	const isAIObservabilityEnabled = useIsAIObservabilityEnabled();

	// Derived, not stored: the AI mode is a per-query tag, so the active tab is whatever the
	// queries currently say. A mode the kind no longer offers (after a kind switch) falls back
	// to the builder rather than selecting a tab that isn't rendered.
	const activeMode = getQueryMode(currentQuery);

	const handleQueryCategoryChange = useCallback(
		(mode: string): void => {
			redirectWithQueryBuilderData(
				withQueryMode(currentQuery, mode as PanelQueryMode),
			);
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
		() => mergeQueryBuilderFieldRule(panelDefinition.queryBuilderFields, signal),
		[panelDefinition.queryBuilderFields, signal],
	);

	const items = useMemo(() => {
		const supportedModes = listQueryModes(
			panelDefinition.supportedQueryModes,
		).filter((mode) => mode !== AI_QUERY_MODE || isAIObservabilityEnabled);

		const queryTypeComponents = {
			[EQueryType.QUERY_BUILDER]: {
				icon: <Atom size={14} />,
				label: 'Query Builder',
				component: (
					<div className="query-builder-v2-container">
						<QueryBuilderV2
							panelType={panelType}
							filterConfigs={filterConfigs}
							showTraceOperator={!isListViewPanel}
							version="v3"
							isListViewPanel={isListViewPanel}
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
			// Traces only, and the source selector is hidden with it: an AI query that moved
			// off traces is no longer an AI query. `queryVariant: 'static'` matches the AI
			// explorer's builder.
			[AI_QUERY_MODE]: {
				icon: <Sparkles size={14} />,
				label: 'AI Query Builder',
				component: (
					<div className="query-builder-v2-container">
						<QueryBuilderV2
							panelType={panelType}
							filterConfigs={filterConfigs}
							showTraceOperator={false}
							version="v3"
							queryComponents={{}}
							config={{
								initialDataSource: DataSource.TRACES,
								queryVariant: 'static',
							}}
						/>
					</div>
				),
			},
		};

		return supportedModes.map((mode) => ({
			key: mode,
			label: (
				<div className={styles.queryTypeTab}>
					{queryTypeComponents[mode].icon}
					<Typography>{queryTypeComponents[mode].label}</Typography>
				</div>
			),
			children: queryTypeComponents[mode].component,
		}));
	}, [
		panelDefinition,
		panelType,
		filterConfigs,
		isDarkMode,
		isListViewPanel,
		isAIObservabilityEnabled,
	]);

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
					className={cx(styles.tabsContainer, {
						[styles.stickyNav]: stickyHeader,
					})}
					activeKey={activeMode}
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
