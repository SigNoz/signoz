import { Card, Form, Input, Typography } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSaveView } from 'hooks/saveViews/useSaveView';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { useTranslation } from 'react-i18next';

import { SaveButton } from './styles';
import { SaveViewFormProps, SaveViewWithNameProps } from './types';
import { saveViewHandler } from './utils';

function SaveViewWithName({
	sourcePage,
	handlePopOverClose,
	refetchAllView,
}: SaveViewWithNameProps): JSX.Element {
	const [form] = Form.useForm<SaveViewFormProps>();
	const { t } = useTranslation(['explorer']);
	const {
		currentQuery,
		panelType,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();
	const { notifications } = useNotifications();
	const compositeQuery = mapCompositeQueryFromQuery(currentQuery, panelType);

	const { isLoading, mutateAsync: saveViewAsync } = useSaveView({
		viewName: form.getFieldValue('viewName'),
		compositeQuery,
		sourcePage,
		extraData: '',
	});

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
			viewName: form.getFieldValue('viewName'),
			form,
		});
	};

	return (
		<Card>
			<Typography>{t('name_of_the_view')}</Typography>
			<Form form={form} onFinish={onSaveHandler} requiredMark>
				<Form.Item
					name={['viewName']}
					required
					rules={[
						{
							required: true,
							message: 'Please enter view name',
						},
					]}
				>
					<Input placeholder="Enter Name" />
				</Form.Item>
				<SaveButton
					htmlType="submit"
					type="primary"
					loading={isLoading}
					data-testid="save-view-name-action-button"
				>
					Save
				</SaveButton>
			</Form>
		</Card>
	);
}

export default SaveViewWithName;
