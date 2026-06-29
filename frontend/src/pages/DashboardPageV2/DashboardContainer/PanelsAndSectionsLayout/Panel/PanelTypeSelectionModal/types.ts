import type { PanelKind } from '../../../Panels/types/panelKind';

export interface PanelType {
	pluginKind: PanelKind;
	label: string;
	icon: JSX.Element;
}
