import { Callout } from '@signozhq/ui/callout';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'react-query';
import { CircleCheck, Landmark, MonitorDown } from '@signozhq/icons';
import {
	Card,
	Col,
	Flex,
	Row,
	Skeleton,
	Table,
	TableColumnsType as ColumnsType,
} from 'antd';
import { Badge } from '@signozhq/ui/badge';
import getUsage, {
	BreakdownEntry,
	UsageResponsePayloadProps,
} from 'api/billing/getUsage';
import logEvent from 'api/common/logEvent';
import updateCreditCardApi from 'api/v1/checkout/create';
import manageCreditCardApi from 'api/v1/portal/create';
import RefreshPaymentStatus from 'components/RefreshPaymentStatus/RefreshPaymentStatus';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useAxiosError from 'hooks/useAxiosError';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useNotifications } from 'hooks/useNotifications';
import { isEmpty, pick } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { ErrorResponse, SuccessResponse, SuccessResponseV2 } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import { getBaseUrl } from 'utils/basePath';
import { getFormattedDate, getRemainingDays } from 'utils/timeUtils';

import CancelSubscriptionBanner from './CancelSubscriptionBanner';
import { BillingUsageGraph } from './BillingUsageGraph/BillingUsageGraph';
import { prepareCsvData } from './BillingUsageGraph/utils';

import styles from './BillingContainer.module.scss';
import { LicenseState } from 'types/api/licensesV3/getActive';

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
		title: 'Cost',
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
	const [daysRemaining, setDaysRemaining] = useState(0);
	const [isFreeTrial, setIsFreeTrial] = useState(false);
	const [data, setData] = useState<DataType[]>([]);
	const [apiResponse, setApiResponse] = useState<
		Partial<UsageResponsePayloadProps>
	>({});

	const {
		user,
		org,
		trialInfo,
		isFetchingActiveLicense,
		activeLicense,
		activeLicenseFetchError,
	} = useAppContext();
	const { notifications } = useNotifications();

	const handleError = useAxiosError();

	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const processUsageData = useCallback(
		(data: SuccessResponse<UsageResponsePayloadProps> | ErrorResponse): void => {
			if (isEmpty(data?.payload)) {
				return;
			}
			const {
				details: { breakdown = [], billTotal },
				billingPeriodStart,
				billingPeriodEnd,
			} = (data as SuccessResponse<UsageResponsePayloadProps>).payload;
			const formattedUsageData: DataType[] = [];

			if (breakdown && Array.isArray(breakdown)) {
				for (let index = 0; index < breakdown.length; index += 1) {
					const element: BreakdownEntry = breakdown[index];

					element?.tiers?.forEach((tier, i: number) => {
						formattedUsageData.push({
							key: `${index}${i}`,
							name: i === 0 ? element?.type : '',
							unit: element?.unit ?? '',
							dataIngested: `${tier.quantity} ${element?.unit}`,
							pricePerUnit: String(tier.unitPrice),
							cost: `$ ${tier.tierCost}`,
						});
					});
				}
			}

			setData(formattedUsageData);

			if (!trialInfo?.onTrial) {
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
		[trialInfo?.onTrial],
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
		if (
			!isFetchingActiveLicense &&
			!activeLicenseFetchError &&
			trialInfo?.onTrial
		) {
			const remainingDays = getRemainingDays(trialInfo?.trialEnd);

			setIsFreeTrial(true);
			setBillAmount(0);
			setDaysRemaining(remainingDays > 0 ? remainingDays : 0);
			setHeaderText(
				`You are in free trial period. Your free trial will end on ${getFormattedDate(
					trialInfo?.trialEnd,
				)}`,
			);
		}
	}, [
		activeLicense,
		trialInfo?.onTrial,
		trialInfo?.trialEnd,
		isFetchingActiveLicense,
		activeLicenseFetchError,
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
			align: 'right',
		},
		{
			title: 'Price per Unit',
			dataIndex: 'pricePerUnit',
			key: 'pricePerUnit',
			align: 'right',
		},
		{
			title: 'Cost',
			dataIndex: 'cost',
			key: 'cost',
			align: 'right',
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
		data: SuccessResponseV2<CheckoutSuccessPayloadProps>,
	): void => {
		if (data?.data?.redirectURL) {
			const newTab = document.createElement('a');
			newTab.href = data.data.redirectURL;
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

	const { mutate: manageCreditCard, isLoading: isLoadingManageBilling } =
		useMutation(manageCreditCardApi, {
			onSuccess: (data) => {
				handleBillingOnSuccess(data);
			},
			onError: handleBillingOnError,
		});

	const handleBilling = useCallback(async () => {
		if (!trialInfo?.trialConvertedToSubscription) {
			void logEvent('Billing : Upgrade Plan', {
				user: pick(user, ['email', 'userId', 'name']),
				org,
			});

			updateCreditCard({
				url: getBaseUrl(),
			});
		} else {
			void logEvent('Billing : Manage Billing', {
				user: pick(user, ['email', 'userId', 'name']),
				org,
			});

			manageCreditCard({
				url: getBaseUrl(),
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isFreeTrial,
		trialInfo?.trialConvertedToSubscription,
		manageCreditCard,
		updateCreditCard,
	]);

	const subscriptionPastDueMessage = (): JSX.Element => (
		<Typography>
			{`We were not able to process payments for your account. Please update your card details `}
			<Typography.Link
				onClick={handleBilling}
				style={{ cursor: 'pointer', color: 'var(--bg-cherry-500)' }}
			>
				{t('here')}
			</Typography.Link>
			{` if your payment information has changed. Email us at `}
			<Typography.Text color="muted">cloud-support@signoz.io</Typography.Text>
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
		!trialInfo?.trialConvertedToSubscription &&
		!trialInfo?.onTrial &&
		trialInfo?.gracePeriodEnd;

	return (
		<div className={styles.billingContainer}>
			<Flex vertical gap={4} className={styles.pageHeader}>
				<Typography.Text className={styles.pageHeaderTitle}>
					{t('billing')}
				</Typography.Text>
				<Typography.Text className={styles.pageHeaderSubtitle}>
					{t('manage_billing_and_costs')}
				</Typography.Text>
			</Flex>

			<Card
				bordered={false}
				style={{ minHeight: 150, marginBottom: 16 }}
				className={styles.pageInfo}
			>
				<Flex justify="space-between" align="center">
					<Flex vertical gap={8}>
						<p className={styles.pageInfoTitle}>
							{isCloudUserVal ? t('teams_cloud') : t('teams')}{' '}
							{isFreeTrial ? <Badge color="success"> Free Trial </Badge> : ''}
						</p>

						{!isLoading && !isFetchingBillingData && !showGracePeriodMessage ? (
							<p className={styles.pageInfoSubtitle}>
								{daysRemaining} {daysRemainingStr}
							</p>
						) : null}
					</Flex>
					<Button
						testId="header-billing-button"
						variant="solid"
						color="secondary"
						size="md"
						loading={isLoadingBilling || isLoadingManageBilling}
						disabled={isLoading}
						onClick={handleBilling}
						prefix={<Landmark size={14} />}
						className={styles.billingManageBtn}
					>
						{trialInfo?.trialConvertedToSubscription
							? t('manage_billing')
							: t('upgrade_plan')}
					</Button>
				</Flex>

				{trialInfo?.onTrial && trialInfo?.trialConvertedToSubscription && (
					<Typography.Text
						truncate={1}
						style={{ fontWeight: '300', color: 'var(--bg-forest-500)', fontSize: 12 }}
					>
						{t('card_details_recieved_and_billing_info')}
					</Typography.Text>
				)}

				{!isLoading && !isFetchingBillingData && !showGracePeriodMessage
					? headerText && (
							<Callout
								title={headerText}
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
				trialInfo?.gracePeriodEnd &&
				showGracePeriodMessage ? (
					<Callout
						title={`Your data is safe with us until ${getFormattedDate(
							trialInfo?.gracePeriodEnd || Date.now(),
						)}. Please upgrade plan now to retain your data.`}
						type="info"
						showIcon
						style={{ marginTop: 12 }}
					/>
				) : null}

				{isSubscriptionPastDue &&
					(!isLoading && !isFetchingBillingData ? (
						<Callout type="error" showIcon style={{ marginTop: 12 }}>
							{subscriptionPastDueMessage()}
						</Callout>
					) : (
						<Skeleton.Input active style={{ height: 20, marginTop: 20 }} />
					))}
			</Card>

			<div className={styles.billingGraphSection}>
				{!isLoading && !isFetchingBillingData ? (
					<BillingUsageGraph data={apiResponse} billAmount={billAmount} />
				) : (
					<Card className={styles.emptyGraphCard} bordered={false}>
						<Spinner size="large" tip="Loading..." height="35vh" />
					</Card>
				)}
				{!isLoading && !isFetchingBillingData && (
					<div className={styles.billingGraphFooter}>
						<Button
							variant="outlined"
							color="secondary"
							size="md"
							onClick={handleCsvDownload}
							prefix={<MonitorDown size={14} />}
							testId="download-csv-button"
							className={styles.billingFooterBtn}
						>
							Download CSV
						</Button>
						<RefreshPaymentStatus type="button" className={styles.billingFooterBtn} />
					</div>
				)}
			</div>
			{!isLoading && !isFetchingBillingData && (
				<Callout type="info" size="small" className={styles.billingUpdateNote}>
					Billing metrics are updated once every 24 hours.
				</Callout>
			)}

			<div className={styles.billingDetails}>
				{!isLoading && !isFetchingBillingData && (
					<Table
						columns={columns}
						dataSource={data}
						pagination={false}
						bordered={false}
						components={{
							header: {
								cell: ({
									style,
									...props
								}: React.ThHTMLAttributes<HTMLTableCellElement>): JSX.Element => {
									const { background: _, boxShadow: __, ...safeStyle } = style ?? {};
									return (
										<th
											{...props}
											style={safeStyle}
											className={`${props.className ?? ''} ${styles.billingDetailsHeaderCell}`}
										/>
									);
								},
							},
						}}
					/>
				)}

				{(isLoading || isFetchingBillingData) && renderTableSkeleton()}
			</div>

			{isCloudUserVal && activeLicense?.state === LicenseState.ACTIVATED && (
				<CancelSubscriptionBanner />
			)}

			{!trialInfo?.trialConvertedToSubscription && (
				<div className={styles.upgradePlanBenefits}>
					<Row
						justify="space-between"
						align="middle"
						style={{
							margin: 0,
						}}
						gutter={[16, 16]}
					>
						<Col span={20} className={styles.planBenefits}>
							<Typography.Text className={styles.planBenefit}>
								<CircleCheck size="md" />
								{t('upgrade_now_text')}
							</Typography.Text>
							<Typography.Text className={styles.planBenefit}>
								<CircleCheck size="md" />
								{t('Your billing will start only after the trial period')}
							</Typography.Text>
							<Typography.Text className={styles.planBenefit}>
								<CircleCheck size="md" />
								<span>
									{t('checkout_plans')} &nbsp;
									<a
										href="https://signoz.io/pricing/"
										style={{
											color: 'var(--bg-cherry-300)',
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
								testId="upgrade-plan-button"
								variant="solid"
								color="primary"
								size="md"
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
