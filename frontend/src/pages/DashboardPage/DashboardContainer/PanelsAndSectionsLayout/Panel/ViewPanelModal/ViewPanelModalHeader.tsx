import { PenLine, RotateCw } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { usePanelTypeSelectItems } from 'pages/DashboardPage/DashboardContainer/PanelEditor/ConfigPane/PanelTypeSwitcher/usePanelTypeSelectItems';
import ConfigSelect from 'pages/DashboardPage/DashboardContainer/PanelEditor/ConfigPane/controls/ConfigSelect/ConfigSelect';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { EQueryType } from 'types/common/dashboard';

import styles from './ViewPanelModal.module.scss';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

interface ViewPanelModalHeaderBaseProps {
	onSwitchToEdit: () => void;
	/** Draft's current kind (selected value of the panel-type selector). */
	panelKind: PanelKind;
	onChangePanelKind: (kind: PanelKind) => void;
}

interface QueryViewModalHeaderProps extends ViewPanelModalHeaderBaseProps {
	mode: 'query';
	selectedInterval: Time | CustomTimeType;
	/** Current window bounds (epoch ms) — seed the picker's modal display. */
	startMs: number;
	endMs: number;
	onTimeChange: (
		interval: Time | CustomTimeType,
		range?: [number, number],
	) => void;
	/** Any query in flight — spins the refresh icon and disables it. */
	isFetching: boolean;
	onRefresh: () => void;
	/**
	 * The active query-builder tab (Query Builder / PromQL / ClickHouse). The type
	 * selector greys out kinds that can't be authored in it — e.g. List is
	 * Query-Builder-only, so PromQL/ClickHouse disable it.
	 */
	queryType: EQueryType;
	/** Current builder datasource — greys out kinds that don't support it (e.g. List needs logs/traces, not metrics). */
	signal: TelemetrytypesSignalDTO;
	/** Restore the saved query + kind (drilldown reset). */
	onResetQuery: () => void;
}

interface StaticViewModalHeaderProps extends ViewPanelModalHeaderBaseProps {
	mode: 'static';
}

type ViewPanelModalHeaderProps =
	| QueryViewModalHeaderProps
	| StaticViewModalHeaderProps;

/**
 * Toolbar for the View modal: reset the drilldown, open the full editor, switch the
 * visualization kind, pick a per-view time window (isolated from the dashboard), and
 * refresh. Mirrors V1's FullView header controls. In static mode only the kind
 * selector and the edit switch remain — the rest is query machinery.
 */
function ViewPanelModalHeader(props: ViewPanelModalHeaderProps): JSX.Element {
	const { onSwitchToEdit, panelKind, onChangePanelKind } = props;
	const query = props.mode === 'query' ? props : null;

	// Same capabilities-guarded options as the editor's PanelTypeSwitcher, so the two
	// selectors disable the same kinds (e.g. List under PromQL, metrics-only kinds).
	const panelTypeItems = usePanelTypeSelectItems({
		queryType: query?.queryType ?? EQueryType.QUERY_BUILDER,
		signal: query?.signal,
	});
	const canEditDashboard = useDashboardStore((s) => s.canEditDashboard);
	const isLocked = useDashboardStore((s) => s.isLocked);

	const canSwitchToEdit = canEditDashboard && !isLocked;

	return (
		<div className={styles.toolbar}>
			<div className={styles.panelTypeSelector}>
				<ConfigSelect<PanelKind>
					testId="view-panel-type-selector"
					value={panelKind}
					items={panelTypeItems}
					onChange={onChangePanelKind}
				/>
			</div>
			{canSwitchToEdit && (
				<Button
					variant="outlined"
					color="secondary"
					prefix={<PenLine />}
					onClick={onSwitchToEdit}
					data-testid="view-panel-switch-to-edit"
				>
					Switch to Edit Mode
				</Button>
			)}
			{query && (
				<Button
					variant="link"
					color="primary"
					onClick={query.onResetQuery}
					data-testid="view-panel-reset-query"
				>
					Reset Query
				</Button>
			)}
			{query && (
				<div className={styles.toolbarTime}>
					<DateTimeSelectionV2
						showAutoRefresh={false}
						showRefreshText={false}
						hideShareModal
						isModalTimeSelection
						disableUrlSync
						onTimeChange={query.onTimeChange}
						modalSelectedInterval={query.selectedInterval as Time}
						modalInitialStartTime={query.startMs}
						modalInitialEndTime={query.endMs}
					/>
					<Button
						size="icon"
						variant="outlined"
						color="secondary"
						onClick={query.onRefresh}
						disabled={query.isFetching}
						aria-label="Refresh"
						data-testid="view-panel-refresh"
					>
						<RotateCw className={cx({ 'animate-spin': query.isFetching })} />
					</Button>
				</div>
			)}
		</div>
	);
}

export default ViewPanelModalHeader;
