import { Widgets } from 'types/api/dashboard/getAll';

export interface GraphLayoutProps {
	onAddPanelHandler: VoidFunction;
	widgets?: Widgets[];
}
