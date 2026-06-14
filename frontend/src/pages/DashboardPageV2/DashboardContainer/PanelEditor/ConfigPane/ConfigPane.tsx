import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels';

import type { PanelDisplayDraft } from '../types';
import type { LegendSeries } from '../useLegendSeries';
import SectionSlot from './SectionSlot/SectionSlot';

import styles from './ConfigPane.module.scss';

interface ConfigPaneProps {
	display: PanelDisplayDraft;
	onChangeDisplay: (next: Partial<PanelDisplayDraft>) => void;
	/** Full plugin kind (e.g. `signoz/TimeSeriesPanel`); drives which sections show. */
	panelKind: string | undefined;
	/** The panel spec the section editors read/write through the registry lens. */
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/** Panel's resolved series, provided to sections that need them (legend colors). */
	legendSeries: LegendSeries[];
}

/**
 * Right-hand configuration pane. Renders the always-present general fields (title +
 * description) followed by the panel kind's configuration sections (Formatting, Axes,
 * …). The section list is declared per kind (`PanelDefinition.sections`) and rendered
 * generically via the section registry — only sections with a built editor appear.
 */
function ConfigPane({
	display,
	onChangeDisplay,
	panelKind,
	spec,
	onChangeSpec,
	legendSeries,
}: ConfigPaneProps): JSX.Element {
	const definition = getPanelDefinition(panelKind);
	const sections = definition?.sections ?? [];

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
						value={display.name}
						placeholder="Panel title"
						onChange={(e): void => onChangeDisplay({ name: e.target.value })}
					/>
				</div>

				<div className={styles.field}>
					<Typography.Text>Description</Typography.Text>
					<Input.TextArea
						data-testid="panel-editor-v2-description"
						value={display.description}
						placeholder="Add a description"
						rows={3}
						onChange={(e): void => onChangeDisplay({ description: e.target.value })}
					/>
				</div>
			</div>

			{sections.length > 0 && (
				<>
					<div className={styles.divider} />
					<span className={styles.eyebrow}>Display</span>
					<div className={styles.sections}>
						{sections.map((config) => (
							<SectionSlot
								key={config.kind}
								config={config}
								spec={spec}
								onChangeSpec={onChangeSpec}
								legendSeries={legendSeries}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export default ConfigPane;
