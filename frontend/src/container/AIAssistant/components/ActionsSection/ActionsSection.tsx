import { useEffect, useState } from 'react';
import { matchPath, useHistory, useLocation } from 'react-router-dom';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import {
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import cx from 'classnames';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import type { MessageActionDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import {
	ApplyFilterSignalDTO,
	MessageActionKindDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import {
	restoreExecution,
	revertExecution,
	undoExecution,
} from 'api/ai-assistant/chat';
import ROUTES from 'constants/routes';
import { QueryParams } from 'constants/query';
import { openInNewTab } from 'utils/navigation';
import {
	ArchiveRestore,
	BookOpen,
	Check,
	ExternalLink,
	Eye,
	Filter,
	LoaderCircle,
	MessageCircle,
	RotateCcw,
	Sparkles,
	TriangleAlert,
	Undo,
} from '@signozhq/icons';

import { useAIAssistantStore } from '../../store/useAIAssistantStore';

import styles from './ActionsSection.module.scss';

interface ActionsSectionProps {
	actions: MessageActionDTO[];
}

type ChipState = 'idle' | 'loading' | 'success' | 'error';

interface ChipResult {
	state: ChipState;
	error?: string;
}

/** Maps each MessageActionKindDTO to its display icon. */
function ActionIcon({
	kind,
	size = 12,
}: {
	kind: MessageActionDTO['kind'];
	size?: number;
}): JSX.Element {
	switch (kind) {
		case MessageActionKindDTO.undo:
			return <Undo size={size} />;
		case MessageActionKindDTO.revert:
			return <RotateCcw size={size} />;
		case MessageActionKindDTO.restore:
			return <ArchiveRestore size={size} />;
		case MessageActionKindDTO.follow_up:
			return <MessageCircle size={size} />;
		case MessageActionKindDTO.open_resource:
			return <Eye size={size} />;
		case MessageActionKindDTO.open_docs:
			return <BookOpen size={size} />;
		case MessageActionKindDTO.apply_filter:
			return <Filter size={size} />;
		default:
			return <ExternalLink size={size} />;
	}
}

/**
 * Resolves an `open_resource` action to an in-app route.
 * Resource taxonomy mirrors `MessageContextDTOType`: dashboard, alert,
 * saved_view, service, and the *_explorer signals.
 */
function resourceRoute(
	resourceType: string,
	resourceId: string,
): string | null {
	switch (resourceType) {
		case 'dashboard':
			return ROUTES.DASHBOARD.replace(':dashboardId', resourceId);
		case 'alert': {
			const params = new URLSearchParams({ [QueryParams.ruleId]: resourceId });
			return `${ROUTES.EDIT_ALERTS}?${params.toString()}`;
		}
		case 'service':
			return ROUTES.SERVICE_METRICS.replace(':servicename', resourceId);
		case 'saved_view':
			// No detail route — saved views land on the list page.
			// Caller may provide signal-aware metadata in future; default to logs.
			return ROUTES.LOGS_SAVE_VIEWS;
		case 'logs_explorer':
			return ROUTES.LOGS_EXPLORER;
		case 'traces_explorer':
			return ROUTES.TRACES_EXPLORER;
		case 'metrics_explorer':
			return ROUTES.METRICS_EXPLORER_EXPLORER;
		default:
			return null;
	}
}

/**
 * The agent emits `action.query` as the SigNoz REST query-range request body:
 *
 *   - V5 (current backend): `{ ..., compositeQuery: { queries: [{ type, spec }] } }`
 *     — each `spec` already carries `filter.expression` directly.
 *   - V3 (legacy): `{ ..., compositeQuery: { builderQueries: { A: {...} } } }`
 *
 * The URL's `compositeQuery` param expects the in-app shape
 * (`{ queryType, builder: { queryData: [...], queryFormulas, queryTraceOperator }, ... }`).
 * `mapQueryDataFromApi` already handles both API shapes for query-range
 * responses, so we delegate to it instead of maintaining a parallel translator.
 *
 * Defensive: if the agent ever sends the URL shape directly (top-level
 * `builder.queryData`), we pass it through unchanged.
 */
function toUrlCompositeQuery(
	actionQuery: Record<string, unknown>,
): Record<string, unknown> | null {
	// Already in URL shape — use as-is (with envelope defaults filled in).
	if (
		actionQuery.builder &&
		typeof actionQuery.builder === 'object' &&
		Array.isArray((actionQuery.builder as Record<string, unknown>).queryData)
	) {
		return {
			queryType: actionQuery.queryType ?? 'builder',
			promql: actionQuery.promql ?? [],
			clickhouse_sql: actionQuery.clickhouse_sql ?? [],
			id: uuidv4(),
			unit: actionQuery.unit ?? '',
			...actionQuery,
		};
	}

	// API shape: extract the inner compositeQuery and let the shared mapper
	// normalise V3/V5 spec → IBuilderQuery for us.
	const composite = (actionQuery.compositeQuery ?? actionQuery) as
		| Record<string, unknown>
		| undefined;
	if (!composite) {
		return null;
	}
	try {
		const mapped = mapQueryDataFromApi(
			composite as unknown as ICompositeMetricQuery,
		);
		// `mapQueryDataFromApi` falls back to `initialQueryState.builder` when
		// neither `queries` nor `builderQueries` is present — detect that and
		// signal "unrecognised payload" instead of silently navigating to an
		// empty query.
		if (mapped.builder.queryData.length === 0) {
			return null;
		}
		return mapped as unknown as Record<string, unknown>;
	} catch {
		return null;
	}
}

/**
 * Tracks apply_filter action keys that have already been auto-applied so we
 * don't re-fire on re-renders / re-mounts. Module-level (intentionally) — it's
 * not state we'd ever want to reset on a component unmount; the action's
 * filters are already on the URL after the first auto-apply.
 */
const autoAppliedFilterKeys = new Set<string>();

/**
 * True when the user is currently on the explorer that an apply_filter
 * action targets — i.e. when auto-applying makes sense (the page is mounted
 * and ready to react to a URL change without a route transition).
 */
function signalMatchesPathname(
	signal: ApplyFilterSignalDTO,
	pathname: string,
): boolean {
	switch (signal) {
		case ApplyFilterSignalDTO.logs:
			return Boolean(
				matchPath(pathname, { path: ROUTES.LOGS_EXPLORER, exact: false }),
			);
		case ApplyFilterSignalDTO.traces:
			return Boolean(
				matchPath(pathname, { path: ROUTES.TRACES_EXPLORER, exact: false }),
			);
		case ApplyFilterSignalDTO.metrics:
			return Boolean(
				matchPath(pathname, {
					path: ROUTES.METRICS_EXPLORER_EXPLORER,
					exact: false,
				}),
			);
		default:
			return false;
	}
}

/**
 * Stable per-action key used both to dedupe auto-applies and as the React key
 * for the chip. Mirrors the same construction we do in the render loop below.
 */
function actionKey(action: MessageActionDTO, index: number): string {
	return action.actionMetadataId
		? `${action.kind}:${action.actionMetadataId}`
		: `${action.kind}:${action.label}:${index}`;
}

/** Maps a signal to its target explorer route. */
function explorerRouteForSignal(signal: ApplyFilterSignalDTO): string | null {
	switch (signal) {
		case ApplyFilterSignalDTO.logs:
			return ROUTES.LOGS_EXPLORER;
		case ApplyFilterSignalDTO.traces:
			return ROUTES.TRACES_EXPLORER;
		case ApplyFilterSignalDTO.metrics:
			return ROUTES.METRICS_EXPLORER_EXPLORER;
		default:
			return null;
	}
}

interface ApplyFilterDeps {
	history: ReturnType<typeof useHistory>;
	pathname: string;
	redirectWithQueryBuilderData: ReturnType<
		typeof useQueryBuilder
	>['redirectWithQueryBuilderData'];
	handleSetQueryData: ReturnType<typeof useQueryBuilder>['handleSetQueryData'];
}

/**
 * The V5 query-builder UI binds the WHERE clause CodeMirror editor to
 * `builder.queryData[i].filter.expression`. The agent normally only sends
 * `filters.items`, so we derive the expression per query before pushing
 * state. Same recipe as `pages/<X>/aiActions.ts` — keeps the immediate
 * UI update consistent with what the URL parser would produce on reload.
 */
function withDerivedFilterExpressions(query: Query): Query {
	const queryData = query.builder.queryData.map((q): IBuilderQuery => {
		const items = q.filters?.items ?? [];
		if (items.length === 0) {
			return q;
		}
		const filters: TagFilter = { items, op: q.filters?.op || 'AND' };
		return {
			...q,
			filters,
			filter: convertFiltersToExpression(filters),
		};
	});
	return { ...query, builder: { ...query.builder, queryData } };
}

/**
 * Single entry point for an apply_filter action — used by both the auto-apply
 * effect (fired once when the user is already on the matching explorer) and
 * the manual chip-click handler.
 *
 *   - On-page: push each builder query into the QueryBuilder provider via
 *     `handleSetQueryData` so the WHERE clause re-renders immediately, then
 *     `redirectWithQueryBuilderData` to persist it on the URL. Mirrors the
 *     page-action recipe — calling redirect alone is not sufficient because
 *     the URL→state effect runs after the next render and the editor binds
 *     to `filter.expression`, not `filters.items`.
 *   - Off-page: use `history.push` so the landing explorer initializes from
 *     the new URL on mount.
 */
function applyFilter(action: MessageActionDTO, deps: ApplyFilterDeps): void {
	// eslint-disable-next-line no-console
	console.log('[apply_filter] enter', {
		signal: action.signal,
		query: action.query,
		pathname: deps.pathname,
	});
	if (!action.signal || !action.query) {
		// eslint-disable-next-line no-console
		console.warn('[apply_filter] bail: missing signal or query', action);
		return;
	}
	const urlQuery = toUrlCompositeQuery(action.query as Record<string, unknown>);
	if (!urlQuery) {
		// eslint-disable-next-line no-console
		console.warn(
			'[apply_filter] bail: toUrlCompositeQuery returned null — agent payload shape unrecognized',
			action.query,
		);
		return;
	}
	const normalized = withDerivedFilterExpressions(urlQuery as unknown as Query);
	// eslint-disable-next-line no-console
	console.log('[apply_filter] normalized', normalized);
	if (signalMatchesPathname(action.signal, deps.pathname)) {
		// eslint-disable-next-line no-console
		console.log('[apply_filter] on-page → handleSetQueryData + redirect');
		normalized.builder.queryData.forEach((q, i) => {
			deps.handleSetQueryData(i, q);
		});
		deps.redirectWithQueryBuilderData(normalized);
		return;
	}
	const base = explorerRouteForSignal(action.signal);
	if (!base) {
		// eslint-disable-next-line no-console
		console.warn('[apply_filter] bail: no route for signal', action.signal);
		return;
	}
	// eslint-disable-next-line no-console
	console.log('[apply_filter] off-page → history.push', base);
	const encoded = encodeURIComponent(JSON.stringify(normalized));
	deps.history.push(`${base}?${QueryParams.compositeQuery}=${encoded}`);
}

/** Picks the right rollback API call for a given action kind. */
function rollbackCall(
	kind: MessageActionDTO['kind'],
): ((id: string) => Promise<unknown>) | null {
	switch (kind) {
		case MessageActionKindDTO.undo:
			return undoExecution;
		case MessageActionKindDTO.revert:
			return revertExecution;
		case MessageActionKindDTO.restore:
			return restoreExecution;
		default:
			return null;
	}
}

/**
 * Renders the actions attached to a single assistant message.
 *
 * Hidden when the message has no actions. Rendered inside `MessageBubble`
 * between the message body and the feedback bar.
 */
export default function ActionsSection({
	actions,
}: ActionsSectionProps): JSX.Element | null {
	const history = useHistory();
	const { pathname } = useLocation();
	const sendMessage = useAIAssistantStore((s) => s.sendMessage);
	const { redirectWithQueryBuilderData, handleSetQueryData } = useQueryBuilder();

	// Per-chip click state, keyed by chip key (see `key` below). Persists
	// loading/success/error so the chip reflects the rollback outcome until
	// the underlying action.state catches up via a fresh thread fetch.
	const [results, setResults] = useState<Record<string, ChipResult>>({});

	// Auto-apply any apply_filter action whose signal matches the page the
	// user is currently on (logs/traces/metrics explorer). Same code path as
	// the manual click below — just fired automatically once. The chip stays
	// clickable as a fallback for the off-page case. Dedupes via a module-
	// level set so re-renders / re-mounts don't re-fire.
	useEffect(() => {
		actions.forEach((action, i) => {
			if (action.kind !== MessageActionKindDTO.apply_filter) {
				return;
			}
			if (!action.signal || !action.query) {
				return;
			}
			if (!signalMatchesPathname(action.signal, pathname)) {
				return;
			}
			const key = actionKey(action, i);
			if (autoAppliedFilterKeys.has(key)) {
				return;
			}
			autoAppliedFilterKeys.add(key);
			applyFilter(action, {
				history,
				pathname,
				redirectWithQueryBuilderData,
				handleSetQueryData,
			});
		});
	}, [
		actions,
		pathname,
		history,
		redirectWithQueryBuilderData,
		handleSetQueryData,
	]);

	if (actions.length === 0) {
		return null;
	}

	const setResult = (key: string, result: ChipResult): void => {
		setResults((prev) => ({ ...prev, [key]: result }));
	};

	const runRollback = async (
		key: string,
		action: MessageActionDTO,
	): Promise<void> => {
		const call = rollbackCall(action.kind);
		if (!call || !action.actionMetadataId) {
			return;
		}
		setResult(key, { state: 'loading' });
		try {
			await call(action.actionMetadataId);
			setResult(key, { state: 'success' });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed';
			setResult(key, { state: 'error', error: message });
		}
	};

	const handleClick = (key: string, action: MessageActionDTO): void => {
		switch (action.kind) {
			case MessageActionKindDTO.open_docs: {
				if (action.url) {
					openInNewTab(action.url);
				}
				break;
			}
			case MessageActionKindDTO.follow_up: {
				if (action.label) {
					void sendMessage(action.label);
				}
				break;
			}
			case MessageActionKindDTO.open_resource: {
				if (action.resourceType && action.resourceId) {
					const path = resourceRoute(action.resourceType, action.resourceId);
					if (path) {
						history.push(path);
					}
				}
				break;
			}
			case MessageActionKindDTO.undo:
			case MessageActionKindDTO.revert:
			case MessageActionKindDTO.restore: {
				void runRollback(key, action);
				break;
			}
			case MessageActionKindDTO.apply_filter: {
				applyFilter(action, {
					history,
					pathname,
					redirectWithQueryBuilderData,
					handleSetQueryData,
				});
				break;
			}
			default:
				break;
		}
	};

	return (
		<div className={styles.section}>
			<div className={styles.heading}>
				<Sparkles size={12} className={styles.headingIcon} />
				<span className={styles.headingText}>Suggested actions</span>
			</div>

			<div className={styles.list}>
				{actions.map((action, i) => {
					// Stable per-action key (shared with the auto-apply dedupe set).
					// `actionMetadataId` alone isn't unique — the server can attach
					// the same id to multiple kinds (e.g. an `undo` and `revert` chip
					// for the same operation), so we always include the kind. Falls
					// back to label + index when the id is missing (e.g. follow_up /
					// open_docs).
					const key = actionKey(action, i);
					const result = results[key];
					const isLoading = result?.state === 'loading';
					const isSuccess = result?.state === 'success';
					const isError = result?.state === 'error';
					// `action.state` is a free-form string from the server (e.g. "active",
					// "applied"). Without a documented terminal vocabulary we don't auto-
					// disable on it — only the local in-flight click result does. The state
					// is still surfaced visually via the suffix pill below.
					const isDisabled = isLoading || isSuccess;

					const tooltip = isError ? result.error : (action.tooltip ?? undefined);

					let icon: JSX.Element;
					if (isLoading) {
						icon = <LoaderCircle size={12} className={styles.spin} />;
					} else if (isSuccess) {
						icon = <Check size={12} />;
					} else if (isError) {
						icon = <TriangleAlert size={12} />;
					} else {
						icon = <ActionIcon kind={action.kind} />;
					}

					const chip = (
						<Button
							variant="outlined"
							color="secondary"
							size="sm"
							className={cx(styles.chip, { [styles.error]: isError })}
							onClick={(): void => handleClick(key, action)}
							disabled={isDisabled}
							aria-label={action.label}
							prefix={icon}
						>
							<span className={styles.chipLabel}>{action.label}</span>
						</Button>
					);

					return tooltip ? (
						<TooltipSimple key={key} title={tooltip}>
							{chip}
						</TooltipSimple>
					) : (
						<span key={key}>{chip}</span>
					);
				})}
			</div>
		</div>
	);
}
