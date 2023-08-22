import { LoadingOutlined } from '@ant-design/icons';
import { Card, Input, Typography } from 'antd';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSaveView } from 'hooks/saveViews/useSaveView';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { ChangeEvent, useCallback, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { SaveButton } from './styles';
import { saveViewHandler } from './utils';

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

	const { isLoading, mutateAsync: saveViewAsync } = useSaveView({
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
		// console.log('compositeQuery', compositeQuery);
		// try {
		// 	const { data } = await saveViewAsync({
		// 		viewName: name,
		// 		compositeQuery,
		// 		sourcePage,
		// 		extraData: '',
		// 	});

		// 	refetchAllView();
		// 	if (!isLoading) {
		// 		redirectWithQueryBuilderData(mapQueryDataFromApi(compositeQuery), {
		// 			[queryParamNamesMap.panelTypes]: panelType,
		// 			[querySearchParams.viewName]: name,
		// 			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// 			// @ts-ignore
		// 			[querySearchParams.viewKey]: data.data,
		// 		});
		// 	}
		// 	notifications.success({
		// 		message: 'View Saved Successfully',
		// 	});
		// } catch (err) {
		// 	notifications.error({
		// 		message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		// 	});
		// } finally {
		// 	handlePopOverClose();
		// }

		saveViewHandler({
			compositeQuery,
			handlePopOverClose,
			extraData: '',
			notifications,
			panelType,
			redirectWithQueryBuilderData,
			refetchAllView,
			saveViewAsync,
			sourcePage,
			viewName: name,
		});
	}, [
		compositeQuery,
		handlePopOverClose,
		name,
		notifications,
		panelType,
		redirectWithQueryBuilderData,
		refetchAllView,
		saveViewAsync,
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
