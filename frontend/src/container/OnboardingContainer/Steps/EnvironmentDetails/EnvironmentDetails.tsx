import { LoadingOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Space, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { useOnboardingContext } from 'container/OnboardingContainer/context/OnboardingContext';
import { useCases } from 'container/OnboardingContainer/OnboardingContainer';
import { useNotifications } from 'hooks/useNotifications';
import { Check, Server } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SupportedEnvironmentsProps {
	name: string;
	id: string;
}

const supportedEnvironments: SupportedEnvironmentsProps[] = [
	{
		name: 'Kubernetes',
		id: 'kubernetes',
	},
	{
		name: 'Linux AMD64',
		id: 'linuxAMD64',
	},
	{
		name: 'Linux ARM64',
		id: 'linuxARM64',
	},
	{
		name: 'MacOS AMD64',
		id: 'macOsAMD64',
	},
	{
		name: 'MacOS ARM64',
		id: 'macOsARM64',
	},
	{
		name: 'Docker',
		id: 'docker',
	},
	{
		name: 'Windows',
		id: 'windows',
	},
];

export default function EnvironmentDetails(): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation(['common']);

	const {
		selectedEnvironment,
		updateSelectedEnvironment,
		selectedModule,
		selectedDataSource,
		selectedFramework,
		errorDetails,
		updateErrorDetails,
	} = useOnboardingContext();

	const requestedEnvironmentName = Form.useWatch(
		'requestedEnvironmentName',
		form,
	);

	const { notifications } = useNotifications();

	const [
		isSubmittingRequestForEnvironment,
		setIsSubmittingRequestForEnvironment,
	] = useState(false);

	const handleRequestedEnvironmentSubmit = async (): Promise<void> => {
		try {
			setIsSubmittingRequestForEnvironment(true);
			const response = await logEvent('Onboarding V2: Environment Requested', {
				module: selectedModule?.id,
				dataSource: selectedDataSource?.id,
				framework: selectedFramework,
				environment: requestedEnvironmentName,
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Environment Request Submitted',
				});

				form.setFieldValue('requestedEnvironmentName', '');

				setIsSubmittingRequestForEnvironment(false);
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});

				setIsSubmittingRequestForEnvironment(false);
			}
		} catch (error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});

			setIsSubmittingRequestForEnvironment(false);
		}
	};

	return (
		<Form
			initialValues={{}}
			form={form}
			name="environment-form"
			layout="vertical"
		>
			<Typography.Text className="environment-title">
				<span className="required-symbol">*</span> Select Environment
			</Typography.Text>

			<div className="supported-environments-container">
				{supportedEnvironments.map((environment) => {
					if (
						selectedModule?.id !== useCases.APM.id &&
						environment.id === 'kubernetes'
					) {
						return null;
					}
					if (
						selectedModule?.id !== useCases.APM.id &&
						environment.id === 'docker'
					) {
						return null;
					}
					if (
						selectedModule?.id !== useCases.APM.id &&
						environment.id === 'windows'
					) {
						return null;
					}

					return (
						<Card
							className={cx(
								'environment',
								selectedEnvironment === environment.id ? 'selected' : '',
							)}
							key={environment.id}
							onClick={(): void => {
								updateSelectedEnvironment(environment.id);
								updateErrorDetails(null);
							}}
						>
							<div>
								<Server size={36} />
							</div>

							<div className="environment-name">
								<Typography.Text> {environment.name} </Typography.Text>
							</div>
						</Card>
					);
				})}
			</div>

			<div className="request-entity-container">
				<Typography.Text>
					Cannot find what you’re looking for? Request an environment
				</Typography.Text>

				<div className="form-section">
					<Space.Compact style={{ width: '100%' }}>
						<Form.Item
							name="requestedEnvironmentName"
							style={{ width: 300, marginBottom: 0 }}
						>
							<Input placeholder="Enter environment name..." />
						</Form.Item>
						<Button
							className="periscope-btn primary"
							icon={
								isSubmittingRequestForEnvironment ? (
									<LoadingOutlined />
								) : (
									<Check size={12} />
								)
							}
							type="primary"
							onClick={handleRequestedEnvironmentSubmit}
							disabled={
								isSubmittingRequestForEnvironment ||
								!requestedEnvironmentName ||
								requestedEnvironmentName?.trim().length === 0
							}
						>
							Submit
						</Button>
					</Space.Compact>
				</div>
			</div>

			{errorDetails && (
				<div className="error-container">
					<Typography.Text type="danger"> {errorDetails} </Typography.Text>
				</div>
			)}
		</Form>
	);
}
