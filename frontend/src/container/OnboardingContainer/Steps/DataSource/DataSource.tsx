/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './DataSource.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useOnboardingContext } from 'container/OnboardingContainer/context/OnboardingContext';
import {
	ModulesMap,
	useCases,
} from 'container/OnboardingContainer/OnboardingContainer';
import {
	getDataSources,
	getSupportedFrameworks,
	hasFrameworks,
	messagingQueueKakfaSupportedDataSources,
} from 'container/OnboardingContainer/utils/dataSourceUtils';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import { Blocks, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { popupContainer } from 'utils/selectPopupContainer';

export interface DataSourceType {
	id?: string;
	name: string;
	imgURL?: string;
	label?: string;
}

export default function DataSource(): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation(['common']);
	const history = useHistory();

	const getStartedSource = useUrlQuery().get(QueryParams.getStartedSource);

	const {
		serviceName,
		selectedModule,
		selectedDataSource,
		selectedFramework,
		updateSelectedDataSource,
		updateSelectedEnvironment,
		updateServiceName,
		updateSelectedFramework,
	} = useOnboardingContext();

	const isKafkaAPM =
		getStartedSource === 'kafka' && selectedModule?.id === ModulesMap.APM;

	const [supportedDataSources, setSupportedDataSources] = useState<
		DataSourceType[]
	>([]);
	const [supportedframeworks, setSupportedframeworks] = useState<
		DataSourceType[]
	>([]);

	const requestedDataSourceName = Form.useWatch('requestedDataSourceName', form);

	const [
		isSubmittingRequestForDataSource,
		setIsSubmittingRequestForDataSource,
	] = useState(false);

	const { notifications } = useNotifications();

	const [enableFrameworks, setEnableFrameworks] = useState(false);

	useEffect(() => {
		if (selectedModule) {
			const dataSource = getDataSources(selectedModule);

			setSupportedDataSources(dataSource);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (selectedModule && selectedDataSource) {
			const frameworks = hasFrameworks({
				module: selectedModule,
				dataSource: selectedDataSource,
			});

			if (frameworks) {
				setEnableFrameworks(true);
				setSupportedframeworks(
					getSupportedFrameworks({
						module: selectedModule,
						dataSource: selectedDataSource,
					}),
				);
			} else {
				setEnableFrameworks(false);
			}
		}
	}, [selectedModule, selectedDataSource]);

	const handleRequestDataSourceSubmit = async (): Promise<void> => {
		try {
			setIsSubmittingRequestForDataSource(true);
			const response = await logEvent('Onboarding V2: Data Source Requested', {
				module: selectedModule?.id,
				dataSource: requestedDataSourceName,
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Data Source Request Submitted',
				});

				form.setFieldValue('requestedDataSourceName', '');

				setIsSubmittingRequestForDataSource(false);
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});

				setIsSubmittingRequestForDataSource(false);
			}
		} catch (error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});

			setIsSubmittingRequestForDataSource(false);
		}
	};

	const goToIntegrationsPage = (): void => {
		logEvent('Onboarding V2: Go to integrations', {
			module: selectedModule?.id,
			dataSource: selectedDataSource?.name,
			framework: selectedFramework,
		});
		history.push(ROUTES.INTEGRATIONS);
	};

	return (
		<div className="module-container">
			<Typography.Text className="data-source-title">
				<span className="required-symbol">*</span> Select Data Source
			</Typography.Text>
			<div className="supported-languages-container">
				{supportedDataSources?.map((dataSource) => (
					<Card
						className={cx(
							'supported-language',
							selectedDataSource?.name === dataSource.name ? 'selected' : '',
							isKafkaAPM &&
								!messagingQueueKakfaSupportedDataSources.includes(dataSource?.id || '')
								? 'disabled'
								: '',
						)}
						key={dataSource.name}
						onClick={(): void => {
							if (!isKafkaAPM) {
								updateSelectedFramework(null);
								updateSelectedEnvironment(null);
								updateSelectedDataSource(dataSource);
								form.setFieldsValue({ selectFramework: null });
							}
						}}
					>
						<div>
							<img
								className={cx('supported-langauge-img')}
								src={dataSource.imgURL}
								alt=""
							/>
						</div>

						<div>
							<Typography.Text className="dataSourceName">
								{dataSource.name}
							</Typography.Text>
						</div>
					</Card>
				))}
			</div>

			<div className="form-container">
				<div className="service-name-container">
					<Form
						initialValues={{
							serviceName,
							selectFramework: selectedFramework,
						}}
						form={form}
						onValuesChange={(): void => {
							const serviceName = form.getFieldValue('serviceName');

							updateServiceName(serviceName);
						}}
						name="data-source-form"
						layout="vertical"
						validateTrigger="onBlur"
					>
						{selectedModule?.id === useCases.APM.id && (
							<>
								<Form.Item
									name="serviceName"
									label="Service Name"
									style={{ width: 300 }}
									rules={[{ required: true, message: 'Please enter service name' }]}
									validateTrigger="onBlur"
								>
									<Input autoFocus />
								</Form.Item>

								{enableFrameworks && (
									<div className="framework-selector">
										<Form.Item
											label="Select Framework"
											name="selectFramework"
											rules={[{ required: true, message: 'Please select framework' }]}
										>
											<Select
												value={selectedFramework}
												getPopupContainer={popupContainer}
												style={{ width: 300 }}
												placeholder="Select Framework"
												onChange={(value): void => updateSelectedFramework(value)}
												options={supportedframeworks}
											/>
										</Form.Item>
									</div>
								)}
							</>
						)}

						<div className="request-entity-container intgeration-page-container">
							<Typography.Text className="intgeration-page-container-text">
								Not able to find datasources you are looking for, check our Integrations
								page which allows more sources of sending data
							</Typography.Text>
							<Button
								onClick={goToIntegrationsPage}
								icon={<Blocks size={14} />}
								className="navigate-integrations-page-btn"
							>
								Go to integrations
							</Button>
						</div>

						<div className="request-entity-container">
							<Typography.Text>
								Cannot find what you’re looking for? Request a data source
							</Typography.Text>

							<div className="form-section">
								<Space.Compact style={{ width: '100%' }}>
									<Form.Item
										name="requestedDataSourceName"
										style={{ width: 300, marginBottom: 0 }}
									>
										<Input placeholder="Enter data source name..." />
									</Form.Item>
									<Button
										className="periscope-btn primary"
										icon={
											isSubmittingRequestForDataSource ? (
												<LoadingOutlined />
											) : (
												<Check size={12} />
											)
										}
										type="primary"
										onClick={handleRequestDataSourceSubmit}
										disabled={
											isSubmittingRequestForDataSource ||
											!requestedDataSourceName ||
											requestedDataSourceName?.trim().length === 0
										}
									>
										Submit
									</Button>
								</Space.Compact>
							</div>
						</div>
					</Form>
				</div>
			</div>
		</div>
	);
}
