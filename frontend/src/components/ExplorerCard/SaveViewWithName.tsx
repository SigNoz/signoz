import { Card, Input, Typography } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSaveView } from 'hooks/saveViews/useSaveView';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { ChangeEvent, useCallback, useState } from 'react';

import { SaveButton } from './styles';
import { SaveViewWithNameProps } from './types';
import { saveViewHandler } from './utils';

function SaveViewWithName({
	sourcePage,
	handlePopOverClose,
	refetchAllView,
}: SaveViewWithNameProps): JSX.Element {
	const [name, setName] = useState('');
	const {
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();
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

	const onSaveHandler = (): void => {
		saveViewHandler({
			compositeQuery,
			handlePopOverClose,
			extraData: '',
			notifications,
			panelType: panelType || PANEL_TYPES.LIST,
			redirectWithQueryBuilderData,
			refetchAllView,
			saveViewAsync,
			sourcePage,
			viewName: name,
			setName,
		});
	};

	return (
		<Card>
			<Typography>Name of the View</Typography>
			<Input placeholder="Enter Name" onChange={onChangeHandler} />
			<SaveButton onClick={onSaveHandler} type="primary" loading={isLoading}>
				Save
			</SaveButton>
		</Card>
	);
}

export default SaveViewWithName;
