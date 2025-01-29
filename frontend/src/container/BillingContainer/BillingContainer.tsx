/* eslint-disable @typescript-eslint/no-loop-func */
import './BillingContainer.styles.scss';

import { CheckCircleOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import {
	Alert,
	Button,
	Card,
	Col,
	Flex,
	Row,
	Skeleton,
	Table,
	Tag,
	Typography,
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import updateCreditCardApi from 'api/billing/checkout';
import getUsage, { UsageResponsePayloadProps } from 'api/billing/getUsage';
import manageCreditCardApi from 'api/billing/manage';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useAxiosError from 'hooks/useAxiosError';
import { useNotifications } from 'hooks/useNotifications';
import { isEmpty, pick } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import { License } from 'types/api/licenses/def';
import { isCloudUser } from 'utils/app';
import { getFormattedDate, getRemainingDays } from 'utils/timeUtils';

import { BillingUsageGraph } from './BillingUsageGraph/BillingUsageGraph';
import { prepareCsvData } from './BillingUsageGraph/utils';

interface DataType {
	key: string;
	name: string;
	unit: string;
	dataIngested: string;
	pricePerUnit: string;
	cost: string;
}

enum SubscriptionStatus {
	PastDue = 'past_due',
	Active = 'active',
}

const renderSkeletonInput = (): JSX.Element => (
	<Skeleton.Input
		style={{ marginTop: '10px', height: '40px', width: '100%' }}
		active
	/>
);

const dummyData: DataType[] = [
	{
		key: '1',
		name: 'Logs',
		unit: '',
		dataIngested: '',
		pricePerUnit: '',
		cost: '',
	},
	{
		key: '2',
		name: 'Traces',
		unit: '',
		dataIngested: '',
		pricePerUnit: '',
		cost: '',
	},
	{
		key: '3',
		name: 'Metrics',
		unit: '',
		dataIngested: '',
		pricePerUnit: '',
		cost: '',
	},
];

const dummyColumns: ColumnsType<DataType> = [
	{
		title: '',
		dataIndex: 'name',
		key: 'name',
		render: renderSkeletonInput,
	},
	{
		title: 'Unit',
		dataIndex: 'unit',
		key: 'unit',
		render: renderSkeletonInput,
	},
	{
		title: 'Data Ingested',
		dataIndex: 'dataIngested',
		key: 'dataIngested',
		render: renderSkeletonInput,
	},
	{
		title: 'Price per Unit',
		dataIndex: 'pricePerUnit',
		key: 'pricePerUnit',
		render: renderSkeletonInput,
	},
	{
		title: 'Cost (Billing period to date)',
		dataIndex: 'cost',
		key: 'cost',
		render: renderSkeletonInput,
	},
];

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function BillingContainer(): JSX.Element {
	const { t } = useTranslation(['billings']);
	const daysRemainingStr = t('days_remaining');
	const [headerText, setHeaderText] = useState('');
	const [billAmount, setBillAmount] = useState(0);
	const [activeLicense, setActiveLicense] = useState<License | null>(null);
	const [daysRemaining, setDaysRemaining] = useState(0);
	const [isFreeTrial, setIsFreeTrial] = useState(false);
	const [data, setData] = useState<any[]>([]);
	const [apiResponse, setApiResponse] = useState<
		Partial<UsageResponsePayloadProps>
	>({});

	const {
		user,
		org,
		licenses,
		isFetchingLicenses,
		licensesFetchError,
	} = useAppContext();
	const { notifications } = useNotifications();

	const handleError = useAxiosError();

	const isCloudUserVal = isCloudUser();

	const processUsageData = useCallback(
		(data: any): void => {
			if (isEmpty(data?.payload)) {
				return;
			}
			const {
				details: { breakdown = [], billTotal },
				billingPeriodStart,
				billingPeriodEnd,
			} = data?.payload || {};
			const formattedUsageData: any[] = [];

			if (breakdown && Array.isArray(breakdown)) {
				for (let index = 0; index < breakdown.length; index += 1) {
					const element = breakdown[index];

					element?.tiers.forEach(
						(
							tier: { quantity: number; unitPrice: number; tierCost: number },
							i: number,
						) => {
							formattedUsageData.push({
								key: `${index}${i}`,
								name: i === 0 ? element?.type : '',
								dataIngested: `${tier.quantity} ${element?.unit}`,
								pricePerUnit: tier.unitPrice,
								cost: `$ ${tier.tierCost}`,
							});
						},
					);
				}
			}

			setData(formattedUsageData);

			if (!licenses?.onTrial) {
				const remainingDays = getRemainingDays(billingPeriodEnd) - 1;

				setHeaderText(
					`Your current billing period is from ${getFormattedDate(
						billingPeriodStart,
					)} to ${getFormattedDate(billingPeriodEnd)}`,
				);
				setDaysRemaining(remainingDays > 0 ? remainingDays : 0);
				setBillAmount(billTotal);
			}

			setApiResponse(data?.payload || {});
		},
		[licenses?.onTrial],
	);

	const isSubscriptionPastDue =
		apiResponse.subscriptionStatus === SubscriptionStatus.PastDue;

	const {
		isLoading,
		isFetching: isFetchingBillingData,
		data: billingData,
	} = useQuery([REACT_QUERY_KEY.GET_BILLING_USAGE, user?.id], {
		queryFn: () => getUsage(activeLicense?.key || ''),
		onError: handleError,
		enabled: activeLicense !== null,
		onSuccess: processUsageData,
	});

	useEffect(() => {
		const activeValidLicense =
			licenses?.licenses?.find((license) => license.isCurrent === true) || null;

		setActiveLicense(activeValidLicense);

		if (!isFetchingLicenses && licenses?.onTrial && !licensesFetchError) {
			const remainingDays = getRemainingDays(licenses?.trialEnd);

			setIsFreeTrial(true);
			setBillAmount(0);
			setDaysRemaining(remainingDays > 0 ? remainingDays : 0);
			setHeaderText(
				`You are in free trial period. Your free trial will end on ${getFormattedDate(
					licenses?.trialEnd,
				)}`,
			);
		}
	}, [
		licenses?.licenses,
		licenses?.onTrial,
		licenses?.trialEnd,
		isFetchingLicenses,
		licensesFetchError,
	]);

	const columns: ColumnsType<DataType> = [
		{
			title: '',
			dataIndex: 'name',
			key: 'name',
			render: (text): JSX.Element => <div>{text}</div>,
		},
		{
			title: 'Data Ingested',
			dataIndex: 'dataIngested',
			key: 'dataIngested',
		},
		{
			title: 'Price per Unit',
			dataIndex: 'pricePerUnit',
			key: 'pricePerUnit',
		},
		{
			title: 'Cost (Billing period to date)',
			dataIndex: 'cost',
			key: 'cost',
		},
	];

	const renderTableSkeleton = (): JSX.Element => (
		<Table
			dataSource={dummyData}
			pagination={false}
			columns={dummyColumns}
			locale={{
				emptyText: dummyData.map((u) => (
					<Skeleton.Input
						key={u.key}
						style={{ marginTop: '10px', height: '50px', width: '100%' }}
						active
					/>
				)),
			}}
		/>
	);

	const handleBillingOnSuccess = (
		data: ErrorResponse | SuccessResponse<CheckoutSuccessPayloadProps, unknown>,
	): void => {
		if (data?.payload?.redirectURL) {
			const newTab = document.createElement('a');
			newTab.href = data.payload.redirectURL;
			newTab.target = '_blank';
			newTab.rel = 'noopener noreferrer';
			newTab.click();
		}
	};

	const handleBillingOnError = (): void => {
		notifications.error({
			message: SOMETHING_WENT_WRONG,
		});
	};

	const { mutate: updateCreditCard, isLoading: isLoadingBilling } = useMutation(
		updateCreditCardApi,
		{
			onSuccess: (data) => {
				handleBillingOnSuccess(data);
			},
			onError: handleBillingOnError,
		},
	);

	const {
		mutate: manageCreditCard,
		isLoading: isLoadingManageBilling,
	} = useMutation(manageCreditCardApi, {
		onSuccess: (data) => {
			handleBillingOnSuccess(data);
		},
		onError: handleBillingOnError,
	});

	const handleBilling = useCallback(async () => {
		if (!licenses?.trialConvertedToSubscription) {
			logEvent('Billing : Upgrade Plan', {
				user: pick(user, ['email', 'userId', 'name']),
				org,
			});

			updateCreditCard({
				licenseKey: activeLicense?.key || '',
				successURL: window.location.href,
				cancelURL: window.location.href,
			});
		} else {
			logEvent('Billing : Manage Billing', {
				user: pick(user, ['email', 'userId', 'name']),
				org,
			});

			manageCreditCard({
				licenseKey: activeLicense?.key || '',
				successURL: window.location.href,
				cancelURL: window.location.href,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		activeLicense?.key,
		isFreeTrial,
		licenses?.trialConvertedToSubscription,
		manageCreditCard,
		updateCreditCard,
	]);

	const BillingUsageGraphCallback = useCallback(
		() =>
			!isLoading && !isFetchingBillingData ? (
				<>
					<BillingUsageGraph data={apiResponse} billAmount={billAmount} />
					<div className="billing-update-note">
						Note: Billing metrics are updated once every 24 hours.
					</div>
				</>
			) : (
				<Card className="empty-graph-card" bordered={false}>
					<Spinner size="large" tip="Loading..." height="35vh" />
				</Card>
			),
		[apiResponse, billAmount, isLoading, isFetchingBillingData],
	);

	const { Text } = Typography;
	const subscriptionPastDueMessage = (): JSX.Element => (
		<Typography>
			{`We were not able to process payments for your account. Please update your card details `}
			<Text type="danger" onClick={handleBilling} style={{ cursor: 'pointer' }}>
				{t('here')}
			</Text>
			{` if your payment information has changed. Email us at `}
			<Text type="secondary">cloud-support@signoz.io</Text>
			{` otherwise. Be sure to provide this information immediately to avoid interruption to your service.`}
		</Typography>
	);

	const handleCsvDownload = useCallback((): void => {
		try {
			const csv = prepareCsvData(apiResponse);

			if (!csv.csvData || !csv.fileName) {
				throw new Error('Invalid CSV data or file name.');
			}

			const csvBlob = new Blob([csv.csvData], { type: 'text/csv;charset=utf-8;' });
			const csvUrl = URL.createObjectURL(csvBlob);
			const downloadLink = document.createElement('a');

			downloadLink.href = csvUrl;
			downloadLink.download = csv.fileName;
			document.body.appendChild(downloadLink); // Required for Firefox
			downloadLink.click();

			// Clean up
			downloadLink.remove();
			URL.revokeObjectURL(csvUrl); // Release the memory associated with the object URL
			notifications.success({
				message: 'Download successful',
			});
		} catch (error) {
			console.error('Error downloading the CSV file:', error);
			notifications.error({
				message: SOMETHING_WENT_WRONG,
			});
		}
	}, [apiResponse, notifications]);

	const showGracePeriodMessage =
		!isLoading &&
		!licenses?.trialConvertedToSubscription &&
		!licenses?.onTrial &&
		licenses?.gracePeriodEnd;

	return (
		<div className="billing-container">
			<Flex vertical style={{ marginBottom: 16 }}>
				<Typography.Text style={{ fontWeight: 500, fontSize: 18 }}>
					{t('billing')}
				</Typography.Text>
				<Typography.Text color={Color.BG_VANILLA_400}>
					{t('manage_billing_and_costs')}
				</Typography.Text>
			</Flex>

			<Card
				bordered={false}
				style={{ minHeight: 150, marginBottom: 16 }}
				className="page-info"
			>
				<Flex justify="space-between" align="center">
					<Flex vertical>
						<Typography.Title level={5} style={{ marginTop: 2, fontWeight: 500 }}>
							{isCloudUserVal ? t('teams_cloud') : t('teams')}{' '}
							{isFreeTrial ? <Tag color="success"> Free Trial </Tag> : ''}
						</Typography.Title>

						{!isLoading && !isFetchingBillingData && !showGracePeriodMessage ? (
							<Typography.Text style={{ fontSize: 12, color: Color.BG_VANILLA_400 }}>
								{daysRemaining} {daysRemainingStr}
							</Typography.Text>
						) : null}
					</Flex>
					<Flex gap={20}>
						<Button
							type="dashed"
							size="middle"
							loading={isLoadingBilling || isLoadingManageBilling}
							disabled={isLoading || isFetchingBillingData}
							onClick={handleCsvDownload}
							icon={<CloudDownloadOutlined />}
						>
							Download CSV
						</Button>
						<Button
							data-testid="header-billing-button"
							type="primary"
							size="middle"
							loading={isLoadingBilling || isLoadingManageBilling}
							disabled={isLoading}
							onClick={handleBilling}
						>
							{licenses?.trialConvertedToSubscription
								? t('manage_billing')
								: t('upgrade_plan')}
						</Button>
					</Flex>
				</Flex>

				{licenses?.onTrial && licenses?.trialConvertedToSubscription && (
					<Typography.Text
						ellipsis
						style={{ fontWeight: '300', color: '#49aa19', fontSize: 12 }}
					>
						{t('card_details_recieved_and_billing_info')}
					</Typography.Text>
				)}

				{!isLoading && !isFetchingBillingData && !showGracePeriodMessage
					? headerText && (
							<Alert
								message={headerText}
								type="info"
								showIcon
								style={{ marginTop: 12 }}
							/>
					  )
					: null}

				{isLoading || isFetchingBillingData ? (
					<Skeleton.Input active style={{ height: 20, marginTop: 20 }} />
				) : null}

				{!isLoading &&
				!isFetchingBillingData &&
				billingData &&
				licenses?.gracePeriodEnd &&
				showGracePeriodMessage ? (
					<Alert
						message={`Your data is safe with us until ${getFormattedDate(
							licenses?.gracePeriodEnd || Date.now(),
						)}. Please upgrade plan now to retain your data.`}
						type="info"
						showIcon
						style={{ marginTop: 12 }}
					/>
				) : null}

				{isSubscriptionPastDue &&
					(!isLoading && !isFetchingBillingData ? (
						<Alert
							message={subscriptionPastDueMessage()}
							type="error"
							showIcon
							style={{ marginTop: 12 }}
						/>
					) : (
						<Skeleton.Input active style={{ height: 20, marginTop: 20 }} />
					))}
			</Card>

			<BillingUsageGraphCallback />

			<div className="billing-details">
				{!isLoading && !isFetchingBillingData && (
					<Table
						columns={columns}
						dataSource={data}
						pagination={false}
						bordered={false}
					/>
				)}

				{(isLoading || isFetchingBillingData) && renderTableSkeleton()}
			</div>

			{!licenses?.trialConvertedToSubscription && (
				<div className="upgrade-plan-benefits">
					<Row
						justify="space-between"
						align="middle"
						style={{
							margin: 0,
						}}
						gutter={[16, 16]}
					>
						<Col span={20} className="plan-benefits">
							<Typography.Text className="plan-benefit">
								<CheckCircleOutlined />
								{t('upgrade_now_text')}
							</Typography.Text>
							<Typography.Text className="plan-benefit">
								<CheckCircleOutlined />
								{t('Your billing will start only after the trial period')}
							</Typography.Text>
							<Typography.Text className="plan-benefit">
								<CheckCircleOutlined />
								<span>
									{t('checkout_plans')} &nbsp;
									<a
										href="https://signoz.io/pricing/"
										style={{
											color: '#f99781',
										}}
										target="_blank"
										rel="noreferrer"
									>
										{t('here')}
									</a>
								</span>
							</Typography.Text>
						</Col>
						<Col span={4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
							<Button
								data-testid="upgrade-plan-button"
								type="primary"
								size="middle"
								loading={isLoadingBilling || isLoadingManageBilling}
								onClick={handleBilling}
							>
								{t('upgrade_plan')}
							</Button>
						</Col>
					</Row>
				</div>
			)}
		</div>
	);
}
