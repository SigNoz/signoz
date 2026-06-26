import { Typography } from '@signozhq/ui/typography';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import { getPanelDefinition } from '../../../Panels/registry';
import type { PanelKind } from '../../../Panels/types/panelKind';
import { PANEL_TYPES } from '../../../PanelsAndSectionsLayout/Panel/PanelTypeSelectionModal/constants';
import ConfigSelect from '../controls/ConfigSelect/ConfigSelect';

import styles from './PanelTypeSwitcher.module.scss';

interface PanelTypeSwitcherProps {
	/** The current panel kind (selected value). */
	panelKind: PanelKind;
	/** Panel's current datasource — drives the disabled rule. */
	signal?: TelemetrytypesSignalDTO;
	onChange: (kind: PanelKind) => void;
}

/**
 * Visualization-type selector (rendered inside the Visualization section). Types whose
 * supported signals exclude the panel's current datasource are disabled (V1 parity —
 * e.g. List needs logs/traces, not metrics). The datasource is unknown for
 * PromQL/ClickHouse queries, in which case no type is disabled.
 */
function PanelTypeSwitcher({
	panelKind,
	signal,
	onChange,
}: PanelTypeSwitcherProps): JSX.Element {
	const items = PANEL_TYPES.map(({ pluginKind, label, Icon }) => {
		const definition = getPanelDefinition(pluginKind as PanelKind);
		return {
			value: pluginKind,
			label,
			icon: <Icon size={14} />,
			disabled:
				!!signal && !!definition && !definition.supportedSignals.includes(signal),
		};
	});

	return (
		<div className={styles.field}>
			<Typography.Text>Panel Type</Typography.Text>
			<ConfigSelect
				testId="panel-editor-v2-type-switcher"
				value={panelKind}
				items={items}
				onChange={(value): void => onChange(value as PanelKind)}
			/>
		</div>
	);
}

export default PanelTypeSwitcher;
