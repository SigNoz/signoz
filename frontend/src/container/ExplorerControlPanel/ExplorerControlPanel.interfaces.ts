import { OptionsMenuConfig } from 'container/OptionsMenu/types';

export type ExplorerControlPanelProps = {
	selectedOptionFormat: string;
	isShowPageSize: boolean;
	isLoading: boolean;
	optionsMenuConfig?: OptionsMenuConfig;
};
