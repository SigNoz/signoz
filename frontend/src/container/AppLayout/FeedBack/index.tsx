import { CloseCircleOutlined, CommentOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, notification, Typography } from 'antd';
import { Callbacks } from 'rc-field-form/lib/interface';
import React, { useCallback, useState } from 'react';

import {
	Button as IconButton,
	ButtonContainer,
	Card,
	CenterText,
	Container,
	TitleContainer,
	FormItem,
} from './styles';
const { Title } = Typography;
const { TextArea } = Input;
import sendFeedbackApi from 'api/userFeedback/sendFeedback';

const Feedback = (): JSX.Element => {
	const [isOpen, setisOpen] = useState<boolean>(false);
	const [form] = Form.useForm();
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const [notifications, Element] = notification.useNotification();

	const isToggleHandler = useCallback(() => {
		setisOpen((state) => !state);
	}, []);

	const onFinishHandler: Callbacks<Feedback>['onFinish'] = async (
		value: Feedback,
	): Promise<void> => {
		try {
			setIsLoading(true);
			const { feedback, email = '' } = value;

			const response = await sendFeedbackApi({
				email,
				message: feedback,
			});

			if (response === 200) {
				notifications.success({
					message: 'Thanks for your feedback!',
					description:
						'We have noted down your feedback and will work on improving SIgNoz based on that!',
				});

				isToggleHandler();
			} else {
				notifications.error({
					message: 'Error!',
					description: 'Something went wrong',
				});
			}
			setIsLoading(false);
		} catch (error) {
			notifications.error({
				message: 'Something went wrong',
			});
			setIsLoading(false);
		}
	};

	return (
		<Container>
			{!isOpen && (
				<IconButton onClick={isToggleHandler} type="primary" size="large">
					<CommentOutlined />
				</IconButton>
			)}

			{Element}

			{isOpen && (
				<Form onFinish={onFinishHandler} form={form}>
					<Card>
						<TitleContainer>
							<Title
								aria-label="How can we improve SigNoz?"
								style={{ margin: 0 }}
								level={5}
							>
								How can we improve SigNoz?
							</Title>
							<CloseCircleOutlined onClick={isToggleHandler} />
						</TitleContainer>

						<Divider />

						<FormItem name="feedback" required>
							<TextArea
								required
								rows={3}
								placeholder="Share what can we improve ( e.g. Not able to  find  how to see metrics... )"
							/>
						</FormItem>

						<FormItem name="email">
							<Input type="email" placeholder="Email (optional)" />
						</FormItem>

						<CenterText>This will just be visible to our maintainers</CenterText>

						<ButtonContainer>
							<Button
								disabled={isLoading}
								loading={isLoading}
								htmlType="submit"
								type="primary"
							>
								Share
							</Button>
						</ButtonContainer>
					</Card>
				</Form>
			)}
		</Container>
	);
};

interface Feedback {
	email?: string;
	feedback: string;
}

export default Feedback;
