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
import PromQLIcon from 'assets/Dashboard/PromQl';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import TextToolTip from 'components/TextToolTip';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ClickHouseQueryContainer from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/ClickHouse';
import PromQLQueryContainer from 'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL';
import { PANEL_TYPE_TO_QUERY_TYPES } from 'container/NewWidget/utils';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { EQueryType } from 'types/common/dashboard';

import styles from './PanelEditorQueryBuilder.module.scss';

interface PanelEditorQueryBuilderProps {
	panelType: PANEL_TYPES;
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
 * Query builder for the V2 panel editor's left pane — the queryType tabs
 * (Query Builder / ClickHouse / PromQL) over the shared `QueryBuilderV2` and the
 * V1 ClickHouse/PromQL containers, plus the Stage & Run button. All of these
 * read/write the global `QueryBuilderProvider`; `usePanelEditorQuerySync` owns
 * seeding the provider from the panel and pushing Stage-&-Run results back into
 * the editor draft, so this component is purely the builder UI.
 */
function PanelEditorQueryBuilder({
	panelType,
	isLoadingQueries,
	onStageRunQuery,
	onCancelQuery,
	footer,
}: PanelEditorQueryBuilderProps): JSX.Element {
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

	// ⌘↵ / Ctrl+↵ stages and runs the query while a query-builder field is
	// focused. The global keyboard-hotkeys provider deliberately ignores keydowns
	// originating in inputs / the query editor, so this is handled locally. Uses
	// the capture phase so it fires even for fields that stop the event from
	// bubbling (e.g. the filter search, CodeMirror) — the container sees the
	// keydown on the way down to the focused field.
	const handleKeyDownCapture = useCallback(
		(event: KeyboardEvent<HTMLDivElement>): void => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
				event.preventDefault();
				onStageRunQuery();
			}
		},
		[onStageRunQuery],
	);

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(
		() => ({ stepInterval: { isHidden: false, isDisabled: false } }),
		[],
	);

	const items = useMemo(() => {
		const supportedQueryTypes = PANEL_TYPE_TO_QUERY_TYPES[panelType] || [];

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
	}, [panelType, filterConfigs, isDarkMode]);

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
								label="Stage & Run Query"
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
