import { Typography } from '@signozhq/ui/typography';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import type { PanelKind } from '../../../Panels/types/panelKind';
import type { PanelQueryMode } from '../../../Panels/types/queryModes';
import ConfigSelect from '../controls/ConfigSelect/ConfigSelect';

import styles from './PanelTypeSwitcher.module.scss';
import { usePanelTypeSelectItems } from './usePanelTypeSelectItems';

interface PanelTypeSwitcherProps {
	/** The current panel kind (selected value). */
	panelKind: PanelKind;
	/** Active query mode — a kind that can't be authored in it is disabled (e.g. List is Query-Builder-only, so PromQL/ClickHouse/AI disable it). */
	mode: PanelQueryMode;
	/** Panel's current signal — also gates the disabled rule (List needs logs/traces, not metrics). */
	signal?: TelemetrytypesSignalDTO;
	onChange: (kind: PanelKind) => void;
}

/**
 * Visualization-type selector (rendered inside the Visualization section). A type is
 * disabled when the active query type or signal is incompatible with it — resolved
 * through the capabilities guard. The signal is unknown for PromQL/ClickHouse, but
 * those query types still disable kinds that only support Query Builder (e.g. List).
 */
function PanelTypeSwitcher({
	panelKind,
	mode,
	signal,
	onChange,
}: PanelTypeSwitcherProps): JSX.Element {
	const items = usePanelTypeSelectItems({ mode, signal });

	return (
		<div className={styles.field}>
			<Typography.Text>Panel Type</Typography.Text>
			<ConfigSelect
				testId="panel-editor-v2-type-switcher"
				value={panelKind}
				items={items}
				onChange={(value): void => onChange(value)}
			/>
		</div>
	);
}

export default PanelTypeSwitcher;
