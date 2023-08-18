import { ItemType } from 'antd/es/menu/hooks/useItems';
import { NewDashboardState } from 'container/ListOfDashboard';
import { TFunction } from 'i18next';

export const getDashBoardText = (
	newDashboardState: NewDashboardState,
): string => {
	if (!newDashboardState.error && !newDashboardState.loading) {
		return 'New Dashboard';
	}
	if (newDashboardState.loading) {
		return 'Loading';
	}
	return newDashboardState.errorMessage;
};

interface MenuItems {
	createNewDashboard: boolean;
	t: TFunction;
	isDashboardListLoading: boolean;
	onNewDashboardHandler: () => Promise<void>;
	onModalHandler: (uploadedGrafana: boolean) => void;
}

export const getMenuItems = ({
	createNewDashboard,
	t,
	isDashboardListLoading,
	onNewDashboardHandler,
	onModalHandler,
}: MenuItems): ItemType[] => {
	const menuItems: ItemType[] = [];
	if (createNewDashboard) {
		menuItems.push({
			key: t('create_dashboard').toString(),
			label: t('create_dashboard').toString(),
			disabled: isDashboardListLoading,
			onClick: onNewDashboardHandler,
		});
	}
	menuItems.push({
		key: t('import_json').toString(),
		label: t('import_json').toString(),
		onClick: (): void => onModalHandler(false),
	});
	menuItems.push({
		key: t('import_grafana_json').toString(),
		label: t('import_grafana_json').toString(),
		onClick: (): void => onModalHandler(true),
		disabled: true,
	});
	return menuItems;
};
