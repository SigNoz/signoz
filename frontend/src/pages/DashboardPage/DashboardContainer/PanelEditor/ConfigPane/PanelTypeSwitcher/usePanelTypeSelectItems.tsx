import { useMemo } from 'react';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { EQueryType } from 'types/common/dashboard';

import { PANEL_OPTIONS } from '../../../Panels/registry';
import type { PanelKind } from '../../../Panels/types/panelKind';
import type { ConfigSelectItem } from '../controls/ConfigSelect/ConfigSelect';

import { getPanelTypeDisabledReason } from './utils';

interface UsePanelTypeSelectItemsArgs {
	/** The panel's current kind, which some kinds can't be switched to from. */
	fromKind?: PanelKind;
	/** Active query type — a kind that can't be authored in it is disabled. */
	queryType: EQueryType;
	/** Current datasource — also gates the disabled rule (List needs logs/traces, not metrics). */
	signal?: TelemetrytypesSignalDTO;
}

/**
 * Visualization-kind options for a `ConfigSelect`, each disabled (with a reason
 * tooltip) when the active query type or signal is incompatible — resolved through
 * the capabilities guard, the same rule the editor's `PanelTypeSwitcher` applies.
 */
export function usePanelTypeSelectItems({
	fromKind,
	queryType,
	signal,
}: UsePanelTypeSelectItemsArgs): ConfigSelectItem<PanelKind>[] {
	return useMemo(
		() =>
			PANEL_OPTIONS.map(({ kind, displayName, icon: Icon }) => {
				// One reason drives both the disabled flag and the tooltip, so they can't disagree.
				const disabledReason = getPanelTypeDisabledReason({
					kind,
					fromKind,
					queryType,
					signal,
					label: displayName,
				});
				return {
					value: kind,
					label: displayName,
					icon: <Icon size={14} />,
					disabled: !!disabledReason,
					tooltip: disabledReason,
				};
			}),
		[fromKind, queryType, signal],
	);
}
