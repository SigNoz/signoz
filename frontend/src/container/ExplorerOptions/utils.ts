import { Color } from '@signozhq/design-tokens';
import { showErrorNotification } from 'components/ExplorerCard/utils';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { DataSource } from 'types/common/queryBuilder';

import { SaveNewViewHandlerProps } from './types';

export const getRandomColor = (): Color => {
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
