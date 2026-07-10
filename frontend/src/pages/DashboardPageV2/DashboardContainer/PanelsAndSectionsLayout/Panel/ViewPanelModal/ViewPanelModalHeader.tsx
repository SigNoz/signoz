import { PenLine, RotateCw } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { usePanelTypeSelectItems } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/ConfigPane/PanelTypeSwitcher/usePanelTypeSelectItems';
import ConfigSelect from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/ConfigPane/controls/ConfigSelect/ConfigSelect';
import type { PanelKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import type { EQueryType } from 'types/common/dashboard';

import styles from './ViewPanelModal.module.scss';

interface ViewPanelModalHeaderProps {
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
	onSwitchToEdit: () => void;
	/** Draft's current kind (selected value of the panel-type selector). */
	panelKind: PanelKind;
	/**
	 * The active query-builder tab (Query Builder / PromQL / ClickHouse). The type
	 * selector greys out kinds that can't be authored in it — e.g. List is
	 * Query-Builder-only, so PromQL/ClickHouse disable it.
	 */
	queryType: EQueryType;
	/** Current builder datasource — greys out kinds that don't support it (e.g. List needs logs/traces, not metrics). */
	signal: TelemetrytypesSignalDTO;
	onChangePanelKind: (kind: PanelKind) => void;
	/** Restore the saved query + kind (drilldown reset). */
	onResetQuery: () => void;
}

/**
 * Toolbar for the View modal: reset the drilldown, open the full editor, switch the
 * visualization kind, pick a per-view time window (isolated from the dashboard), and
 * refresh. Mirrors V1's FullView header controls.
 */
function ViewPanelModalHeader({
	selectedInterval,
	startMs,
	endMs,
	onTimeChange,
	isFetching,
	onRefresh,
	onSwitchToEdit,
	panelKind,
	queryType,
	signal,
	onChangePanelKind,
	onResetQuery,
}: ViewPanelModalHeaderProps): JSX.Element {
	// Same capabilities-guarded options as the editor's PanelTypeSwitcher, so the two
	// selectors disable the same kinds (e.g. List under PromQL, metrics-only kinds).
	const panelTypeItems = usePanelTypeSelectItems({ queryType, signal });

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
			<Button
				variant="outlined"
				color="secondary"
				prefix={<PenLine />}
				onClick={onSwitchToEdit}
				data-testid="view-panel-switch-to-edit"
			>
				Switch to Edit Mode
			</Button>
			<Button
				variant="link"
				color="primary"
				onClick={onResetQuery}
				data-testid="view-panel-reset-query"
			>
				Reset Query
			</Button>
			<div className={styles.toolbarTime}>
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
					isModalTimeSelection
					disableUrlSync
					onTimeChange={onTimeChange}
					modalSelectedInterval={selectedInterval as Time}
					modalInitialStartTime={startMs}
					modalInitialEndTime={endMs}
				/>
				<Button
					size="icon"
					variant="solid"
					color="primary"
					onClick={onRefresh}
					disabled={isFetching}
					aria-label="Refresh"
					data-testid="view-panel-refresh"
				>
					<RotateCw className={cx({ 'animate-spin': isFetching })} />
				</Button>
			</div>
		</div>
	);
}

export default ViewPanelModalHeader;
