import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useMemo,
} from 'react';
import { Color } from '@signozhq/design-tokens';
import { Atom, Brain, Terminal } from '@signozhq/icons';
import { Tabs } from 'antd';
import cx from 'classnames';
import { Typography } from '@signozhq/ui/typography';
import PromQLIcon from 'assets/Dashboard/PromQl';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import TextToolTip from 'components/TextToolTip';
import ClickHouseQueryContainer from 'container/QueryBuilder/rawQueryEditors/ClickHouse';
import PromQLQueryContainer from 'container/QueryBuilder/rawQueryEditors/PromQL';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { DataSource } from 'types/common/queryBuilder';

import { isRawRequest } from '../../Panels/types/panelCapabilities';
import type { RenderableQueryPanelDefinition } from '../../Panels/types/panelDefinition';
import { toPanelType } from '../../Panels/types/panelKind';
import { QueryMode } from 'types/common/dashboard';
import { getQueryMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/queryMode';

import styles from './PanelEditorQueryBuilder.module.scss';
import { useQueryModeChange } from './useQueryModeChange';

interface PanelEditorQueryBuilderProps {
	/** The edited kind's definition — drives supported query types + field visibility. */
	panelDefinition: RenderableQueryPanelDefinition;
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
	const isRawQuery = isRawRequest(panelDefinition.queryCapabilities);
	const { currentQuery } = useQueryBuilder();
	const isDarkMode = useIsDarkMode();

	const handleQueryCategoryChange = useQueryModeChange({
		panelKind: panelDefinition.kind,
		panelType,
		supportedQueryModes: panelDefinition.supportedQueryModes,
	});

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

	const items = useMemo(() => {
		const queryTypeComponents: Record<
			QueryMode,
			{ icon: ReactNode; label: string; component: ReactNode }
		> = {
			[QueryMode.QUERY_BUILDER]: {
				icon: <Atom size={14} />,
				label: 'Query Builder',
				component: (
					<div className="query-builder-v2-container">
						<QueryBuilderV2
							panelType={panelType}
							fieldsConfig={panelDefinition.queryBuilderFields}
							showTraceOperator={!isRawQuery}
							version="v3"
							isRawQuery={isRawQuery}
							signalSourceChangeEnabled
							savePreviousQuery
						/>
					</div>
				),
			},
			[QueryMode.CLICKHOUSE]: {
				icon: <Terminal size={14} />,
				label: 'ClickHouse Query',
				component: <ClickHouseQueryContainer />,
			},
			[QueryMode.PROM]: {
				icon: (
					<PromQLIcon
						fillColor={isDarkMode ? Color.BG_VANILLA_200 : Color.BG_INK_300}
					/>
				),
				label: 'PromQL',
				component: <PromQLQueryContainer />,
			},
			[QueryMode.AI_QUERY_BUILDER]: {
				icon: <Brain size={14} />,
				label: 'AI Query Builder',
				component: (
					<div className="query-builder-v2-container">
						<QueryBuilderV2
							panelType={panelType}
							fieldsConfig={panelDefinition.queryBuilderFields}
							showTraceOperator={!isRawQuery}
							version="v3"
							isRawQuery={isRawQuery}
							config={{
								initialDataSource: DataSource.TRACES,
								queryVariant: 'static',
							}}
						/>
					</div>
				),
			},
		};

		const modes = Object.keys(panelDefinition.supportedQueryModes) as QueryMode[];

		return modes.map((queryType) => ({
			key: queryType,
			label: (
				<div className={styles.queryTypeTab}>
					{queryTypeComponents[queryType].icon}
					<Typography>{queryTypeComponents[queryType].label}</Typography>
				</div>
			),
			children: queryTypeComponents[queryType].component,
			// QB wants a null data source and AI pins traces: both mounted, they overwrite each other's provider config in a loop.
			destroyInactiveTabPane:
				queryType === QueryMode.QUERY_BUILDER ||
				queryType === QueryMode.AI_QUERY_BUILDER,
		}));
	}, [panelDefinition, panelType, isDarkMode, isRawQuery]);

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
					activeKey={getQueryMode(currentQuery)}
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
