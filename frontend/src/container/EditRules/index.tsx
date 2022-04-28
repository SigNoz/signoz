import { SaveFilled } from '@ant-design/icons';
import { Button, notification } from 'antd';
import put from 'api/alerts/put';
import Editor from 'components/Editor';
import ROUTES from 'constants/routes';
import { State } from 'hooks/useFetch';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';
import { PayloadProps } from 'types/api/alerts/get';
import { PayloadProps as PutPayloadProps } from 'types/api/alerts/put';

import { ButtonContainer } from './styles';

function EditRules({ initialData, ruleId }: EditRulesProps): JSX.Element {
	const [value, setEditorValue] = useState<string>(initialData);
	const [notifications, Element] = notification.useNotification();
	const [editButtonState, setEditButtonState] = useState<State<PutPayloadProps>>(
		{
			error: false,
			errorMessage: '',
			loading: false,
			success: false,
			payload: undefined,
		},
	);

	const onClickHandler = useCallback(async () => {
		try {
			setEditButtonState((state) => ({
				...state,
				loading: true,
			}));
			const response = await put({
				data: value,
				id: parseInt(ruleId, 10),
			});

			if (response.statusCode === 200) {
				setEditButtonState((state) => ({
					...state,
					loading: false,
					payload: response.payload,
				}));

				notifications.success({
					message: 'Success',
					description: 'Congrats. The alert was Edited correctly.',
				});

				setTimeout(() => {
					history.push(ROUTES.LIST_ALL_ALERT);
				}, 2000);
			} else {
				setEditButtonState((state) => ({
					...state,
					loading: false,
					errorMessage: response.error || 'Something went wrong',
					error: true,
				}));

				notifications.error({
					message: 'Error',
					description:
						response.error ||
						'Oops! Some issue occured in editing the alert please try again or contact support@signoz.io',
				});
			}
		} catch (error) {
			notifications.error({
				message: 'Error',
				description:
					'Oops! Some issue occured in editing the alert please try again or contact support@signoz.io',
			});
		}
	}, [value, ruleId, notifications]);

	return (
		<>
			{Element}

			<Editor onChange={(value): void => setEditorValue(value)} value={value} />

			<ButtonContainer>
				<Button
					loading={editButtonState.loading || false}
					disabled={editButtonState.loading || false}
					icon={<SaveFilled />}
					onClick={onClickHandler}
				>
					Save
				</Button>
			</ButtonContainer>
		</>
	);
}

interface EditRulesProps {
	initialData: PayloadProps['data'];
	ruleId: string;
}

export default EditRules;
