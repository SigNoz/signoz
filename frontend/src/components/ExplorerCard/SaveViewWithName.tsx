import { LoadingOutlined } from '@ant-design/icons';
import { Card, Input, Typography } from 'antd';
import axios from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import {
	queryParamNamesMap,
	querySearchParams,
} from 'constants/queryBuilderQueryNames';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSaveView } from 'hooks/saveViews/useSaveView';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { ChangeEvent, useCallback, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { SaveButton } from './styles';

function SaveViewWithName({
	sourcePage,
	handlePopOverClose,
	refetchAllView,
}: SaveViewWithNameProps): JSX.Element {
	const [name, setName] = useState('');
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const panelType = useGetPanelTypesQueryParam();
	const { notifications } = useNotifications();
	const compositeQuery = mapCompositeQueryFromQuery(currentQuery, panelType);

	const { isLoading, mutateAsync } = useSaveView({
		viewName: name,
		compositeQuery,
		sourcePage,
		extraData: '',
	});

	const onChangeHandler = useCallback(
		(e: ChangeEvent<HTMLInputElement>): void => {
			setName(e.target.value);
		},
		[],
	);

	const onSaveHandler = useCallback(async () => {
		console.log('compositeQuery', compositeQuery);
		try {
			const { data } = await mutateAsync({
				viewName: name,
				compositeQuery,
				sourcePage,
				extraData: '',
			});

			refetchAllView();
			if (!isLoading) {
				redirectWithQueryBuilderData(mapQueryDataFromApi(compositeQuery), {
					[queryParamNamesMap.panelTypes]: panelType,
					[querySearchParams.viewName]: name,
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					[querySearchParams.viewKey]: data.data,
				});
			}
			notifications.success({
				message: 'View Saved Successfully',
			});
		} catch (err) {
			notifications.error({
				message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
			});
		} finally {
			handlePopOverClose();
		}
	}, [
		compositeQuery,
		handlePopOverClose,
		isLoading,
		mutateAsync,
		name,
		notifications,
		panelType,
		redirectWithQueryBuilderData,
		refetchAllView,
		sourcePage,
	]);

	return (
		<Card>
			<Typography>Name of the View</Typography>
			<Input placeholder="Enter Name" onChange={onChangeHandler} />
			<SaveButton
				onClick={onSaveHandler}
				type="primary"
				icon={isLoading && <LoadingOutlined />}
			>
				Save
			</SaveButton>
		</Card>
	);
}

interface SaveViewWithNameProps {
	sourcePage: Lowercase<keyof typeof DataSource>;
	handlePopOverClose: VoidFunction;
	refetchAllView: VoidFunction;
}

export default SaveViewWithName;
