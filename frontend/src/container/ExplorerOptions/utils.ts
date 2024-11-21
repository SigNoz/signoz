import { Color } from '@signozhq/design-tokens';
import { showErrorNotification } from 'components/ExplorerCard/utils';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { DataSource } from 'types/common/queryBuilder';

import { SaveNewViewHandlerProps } from './types';

export const getRandomColor = (): string => {
	const colorKeys = Object.keys(Color) as (keyof typeof Color)[];
	const randomKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
	return Color[randomKey];
};

export const DATASOURCE_VS_ROUTES: Record<DataSource, string> = {
	[DataSource.METRICS]: '',
	[DataSource.TRACES]: ROUTES.TRACES_EXPLORER,
	[DataSource.LOGS]: ROUTES.LOGS_EXPLORER,
};

export const saveNewViewHandler = ({
	saveViewAsync,
	refetchAllView,
	notifications,
	handlePopOverClose,
	viewName,
	compositeQuery,
	sourcePage,
	extraData,
	redirectWithQueryBuilderData,
	panelType,
	setNewViewName,
}: SaveNewViewHandlerProps): void => {
	saveViewAsync(
		{
			viewName,
			compositeQuery,
			sourcePage,
			extraData,
		},
		{
			onSuccess: (data) => {
				refetchAllView();
				redirectWithQueryBuilderData(mapQueryDataFromApi(compositeQuery), {
					[QueryParams.panelTypes]: panelType,
					[QueryParams.viewName]: viewName,
					[QueryParams.viewKey]: data.data.data,
				});
				notifications.success({
					message: 'View Saved Successfully',
				});
			},
			onError: (err) => {
				showErrorNotification(notifications, err);
			},
			onSettled: () => {
				handlePopOverClose();
				setNewViewName('');
			},
		},
	);
};

export const generateRGBAFromHex = (hex: string, opacity: number): string =>
	`rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(
		hex.slice(3, 5),
		16,
	)}, ${parseInt(hex.slice(5, 7), 16)}, ${opacity})`;

export const getExplorerToolBarVisibility = (dataSource: string): boolean => {
	try {
		const showExplorerToolbar = localStorage.getItem(
			LOCALSTORAGE.SHOW_EXPLORER_TOOLBAR,
		);
		if (showExplorerToolbar === null) {
			const parsedShowExplorerToolbar: {
				[DataSource.LOGS]: boolean;
				[DataSource.TRACES]: boolean;
				[DataSource.METRICS]: boolean;
			} = {
				[DataSource.METRICS]: true,
				[DataSource.TRACES]: true,
				[DataSource.LOGS]: true,
			};
			localStorage.setItem(
				LOCALSTORAGE.SHOW_EXPLORER_TOOLBAR,
				JSON.stringify(parsedShowExplorerToolbar),
			);
			return true;
		}
		const parsedShowExplorerToolbar = JSON.parse(showExplorerToolbar || '{}');
		return parsedShowExplorerToolbar[dataSource];
	} catch (error) {
		console.error(error);
		return false;
	}
};

export const setExplorerToolBarVisibility = (
	value: boolean,
	dataSource: string,
): void => {
	try {
		const showExplorerToolbar = localStorage.getItem(
			LOCALSTORAGE.SHOW_EXPLORER_TOOLBAR,
		);
		if (showExplorerToolbar) {
			const parsedShowExplorerToolbar = JSON.parse(showExplorerToolbar);
			parsedShowExplorerToolbar[dataSource] = value;
			localStorage.setItem(
				LOCALSTORAGE.SHOW_EXPLORER_TOOLBAR,
				JSON.stringify(parsedShowExplorerToolbar),
			);
			return;
		}
	} catch (error) {
		console.error(error);
	}
};
