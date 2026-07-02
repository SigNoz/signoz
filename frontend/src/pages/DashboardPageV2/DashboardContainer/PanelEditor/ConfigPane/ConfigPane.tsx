import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import { resolveSignal } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import type { EQueryType } from 'types/common/dashboard';

import type { LegendSeries } from '../hooks/useLegendSeries';
import type { TableColumnOption } from '../hooks/useTableColumns';
import ConfigActions from './ConfigActions/ConfigActions';
import SectionSlot from './SectionSlot/SectionSlot';

import styles from './ConfigPane.module.scss';
import { PanelKind } from '../../Panels/types/panelKind';

interface ConfigPaneProps {
	/** The panel spec — the single editing surface (title/description + section slices). */
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/** Switch the panel to another visualization kind. */
	onChangePanelKind: (kind: PanelKind) => void;
	/**
	 * Active query type from the query-builder provider (the selected tab). Drives which
	 * panel types the visualization switcher disables — read from the provider, not the
	 * spec, because a new panel's spec has no query until staged.
	 */
	queryType: EQueryType;
	/** Panel's resolved series, provided to sections that need them (legend colors). */
	legendSeries: LegendSeries[];
	/** Table panel's resolved value columns, for the table-only editors. */
	tableColumns: TableColumnOption[];
	/** Query step interval (seconds), for the chart-appearance span-gaps floor. */
	stepInterval?: number;
	/**
	 * The draft panel and its id — the "Actions" group seeds cross-page links
	 * (Create alert) from the current query.
	 */
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Unit the selected metric was sent with; drives the unit selector's mismatch warning. */
	metricUnit?: string;
}

/**
 * Right-hand configuration pane. Renders the always-present general fields (title +
 * description) followed by the panel kind's configuration sections (Formatting, Axes,
 * …). The section list is declared per kind (`PanelDefinition.sections`) and rendered
 * generically via the section registry — only sections with a built editor appear.
 */
function ConfigPane({
	spec,
	onChangeSpec,
	onChangePanelKind,
	queryType,
	legendSeries,
	tableColumns,
	stepInterval,
	panel,
	panelId,
	metricUnit,
}: ConfigPaneProps): JSX.Element {
	const panelKind = spec.plugin.kind;
	const definition = getPanelDefinition(panelKind);
	const sections = definition.sections;

	const signal = resolveSignal(spec.queries, definition.supportedSignals[0]);

	// Title/description are just a slice of the spec — edit them through the same
	// onChangeSpec path the sections use, so there's a single editing surface.
	const setDisplayField = (field: 'name' | 'description', value: string): void =>
		onChangeSpec({ ...spec, display: { ...spec.display, [field]: value } });

	return (
		<div className={styles.config}>
			<header className={styles.heading}>
				<Typography.Text>Panel settings</Typography.Text>
			</header>

			<div className={styles.group}>
				<div className={styles.field}>
					<Typography.Text>Title</Typography.Text>
					<Input
						data-testid="panel-editor-v2-title"
						value={spec.display.name}
						placeholder="Panel title"
						onChange={(e): void => setDisplayField('name', e.target.value)}
					/>
				</div>

				<div className={styles.field}>
					<Typography.Text>Description</Typography.Text>
					<Input.TextArea
						data-testid="panel-editor-v2-description"
						value={spec.display.description ?? ''}
						placeholder="Add a description"
						rows={3}
						onChange={(e): void => setDisplayField('description', e.target.value)}
					/>
				</div>
			</div>

			{sections.length > 0 && (
				<>
					<div className={styles.divider} />
					<div className={styles.sectionsContainer}>
						<span className={styles.eyebrow}>Display</span>
						<div className={styles.sections}>
							{sections.map((config) => (
								<SectionSlot
									key={config.kind}
									config={config}
									spec={spec}
									onChangeSpec={onChangeSpec}
									legendSeries={legendSeries}
									tableColumns={tableColumns}
									signal={signal}
									panelKind={panelKind}
									onChangePanelKind={onChangePanelKind}
									queryType={queryType}
									stepInterval={stepInterval}
									metricUnit={metricUnit}
								/>
							))}
						</div>
					</div>
				</>
			)}

			<ConfigActions panel={panel} panelId={panelId} />
		</div>
	);
}

export default ConfigPane;
