import React, { useCallback, useRef, useState } from 'react';
import Editor from 'components/Editor';
import { Title, ButtonContainer } from './styles';
import { Button, notification } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { State } from 'hooks/useFetch';
import createAlertsApi from 'api/alerts/create';
import { PayloadProps as CreateAlertPayloadProps } from 'types/api/alerts/create';
import history from 'lib/history';
import ROUTES from 'constants/routes';

const CreateAlert = () => {
	const value = useRef<string>(`groups:
- name: ExampleCPULoadGroup
  rules:
  - alert: Example Alert
    expr: system_cpu_load_average_1m > 0.1
    for: 0m
    labels:
      severity: warning
    annotations:
      summary: Sample Summary
      description: Sample Description`);

	const [newAlertState, setNewAlertState] = useState<
		State<CreateAlertPayloadProps>
	>({
		error: false,
		errorMessage: '',
		loading: false,
		payload: undefined,
		success: false,
	});
	const [notifications, Element] = notification.useNotification();

	const onSaveHandler = useCallback(async () => {
		try {
			setNewAlertState((state) => ({
				...state,
				loading: true,
			}));

			if (value.current.length === 0) {
				setNewAlertState((state) => ({
					...state,
					loading: false,
				}));
				notifications.error({
					description: `Oops! We didn't catch that. Please make sure the alert settings are not empty or try again`,
					message: 'Error',
				});
				return;
			}

			const response = await createAlertsApi({
				query: value.current,
			});

			if (response.statusCode === 200) {
				setNewAlertState((state) => ({
					...state,
					loading: false,
					payload: response.payload,
				}));
				notifications.success({
					message: 'Success',
				});
				history.push(ROUTES.LIST_ALL_LISTS);
			} else {
				notifications.error({
					description: response.error || 'Something went wrong',
					message: 'Error',
				});
				setNewAlertState((state) => ({
					...state,
					loading: false,
					error: true,
					errorMessage: response.error || 'Something went wrong',
				}));
			}
		} catch (error) {
			notifications.error({
				message: 'Something went wrong',
			});
		}
	}, []);

	return (
		<>
			{Element}

			<Title>Create New Alert</Title>
			<Editor value={value} />

			<ButtonContainer>
				<Button
					loading={newAlertState.loading || false}
					type="primary"
					onClick={onSaveHandler}
					icon={<SaveOutlined />}
				>
					Save
				</Button>
			</ButtonContainer>
		</>
	);
};

export default CreateAlert;
