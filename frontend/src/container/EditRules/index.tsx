import React, { useCallback, useRef, useState } from 'react';
import { Button } from 'antd';
import { EditFilled } from '@ant-design/icons';
import Editor from 'components/Editor';
import { ButtonContainer } from './styles';
import { PayloadProps } from 'types/api/alerts/get';
import { notification } from 'antd';
import put from 'api/alerts/put';
import { State } from 'hooks/useFetch';
import { PayloadProps as PutPayloadProps } from 'types/api/alerts/put';

const EditRules = ({ initialData, ruleId }: EditRulesProps) => {
	const value = useRef<string>(initialData);
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
				data: value.current,
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
	}, []);

	return (
		<>
			{Element}

			<Editor value={value} />

			<ButtonContainer>
				<Button
					loading={editButtonState.loading || false}
					disabled={editButtonState.loading || false}
					icon={<EditFilled />}
					onClick={onClickHandler}
				>
					Edit
				</Button>
			</ButtonContainer>
		</>
	);
};

interface EditRulesProps {
	initialData: PayloadProps['data'];
	ruleId: string;
}

export default EditRules;
