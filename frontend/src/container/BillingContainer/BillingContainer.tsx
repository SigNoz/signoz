/* eslint-disable @typescript-eslint/no-loop-func */
import './BillingContainer.styles.scss';

import { CheckCircleOutlined } from '@ant-design/icons';
import { Button, Col, Row, Skeleton, Table, Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import updateCreditCardApi from 'api/billing/checkout';
import getUsage from 'api/billing/getUsage';
import manageCreditCardApi from 'api/billing/manage';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useAxiosError from 'hooks/useAxiosError';
import useLicense from 'hooks/useLicense';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import { License } from 'types/api/licenses/def';
import AppReducer from 'types/reducer/app';
import { getFormattedDate, getRemainingDays } from 'utils/timeUtils';

interface DataType {
	key: string;
	name: string;
	unit: string;
	dataIngested: string;
	pricePerUnit: string;
	cost: string;
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

export default function BillingContainer(): JSX.Element {
	const daysRemainingStr = 'days remaining in your billing period.';
	const [headerText, setHeaderText] = useState('');
	const [billAmount, setBillAmount] = useState(0);
	const [totalBillAmount, setTotalBillAmount] = useState(0);
	const [activeLicense, setActiveLicense] = useState<License | null>(null);
	const [daysRemaining, setDaysRemaining] = useState(0);
	const [isFreeTrial, setIsFreeTrial] = useState(false);
	const [data, setData] = useState<any[]>([]);
	const billCurrency = '$';

	const { isFetching, data: licensesData, error: licenseError } = useLicense();

	const { user } = useSelector<AppState, AppReducer>((state) => state.app);
	const { notifications } = useNotifications();

	const handleError = useAxiosError();

	const processUsageData = useCallback(
		(data: any): void => {
			const {
				details: { breakdown = [], total, billTotal },
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
								unit: element?.unit,
								dataIngested: tier.quantity,
								pricePerUnit: tier.unitPrice,
								cost: `$ ${tier.tierCost}`,
							});
						},
					);
				}
			}

			setData(formattedUsageData);
			setTotalBillAmount(total);

			if (!licensesData?.payload?.onTrial) {
				const remainingDays = getRemainingDays(billingPeriodEnd) - 1;

				setHeaderText(
					`Your current billing period is from ${getFormattedDate(
						billingPeriodStart,
					)} to ${getFormattedDate(billingPeriodEnd)}`,
				);
				setDaysRemaining(remainingDays > 0 ? remainingDays : 0);
				setBillAmount(billTotal);
			}
		},
		[licensesData?.payload?.onTrial],
	);

	const { isLoading } = useQuery(
		[REACT_QUERY_KEY.GET_BILLING_USAGE, user?.userId],
		{
			queryFn: () => getUsage(activeLicense?.key || ''),
			onError: handleError,
			enabled: activeLicense !== null,
			onSuccess: processUsageData,
		},
	);

	useEffect(() => {
		const activeValidLicense =
			licensesData?.payload?.licenses?.find(
				(license) => license.isCurrent === true,
			) || null;

		setActiveLicense(activeValidLicense);

		if (!isFetching && licensesData?.payload?.onTrial && !licenseError) {
			const remainingDays = getRemainingDays(licensesData?.payload?.trialEnd);

			setIsFreeTrial(true);
			setBillAmount(0);
			setDaysRemaining(remainingDays > 0 ? remainingDays : 0);
			setHeaderText(
				`You are in free trial period. Your free trial will end on ${getFormattedDate(
					licensesData?.payload?.trialEnd,
				)}`,
			);
		}
	}, [isFetching, licensesData?.payload, licenseError]);

	const columns: ColumnsType<DataType> = [
		{
			title: '',
			dataIndex: 'name',
			key: 'name',
			render: (text): JSX.Element => <div>{text}</div>,
		},
		{
			title: 'Unit',
			dataIndex: 'unit',
			key: 'unit',
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

	const renderSummary = (): JSX.Element => (
		<Table.Summary.Row>
			<Table.Summary.Cell index={0}>
				<Typography.Title level={3} style={{ fontWeight: 500, margin: ' 0px' }}>
					Total
				</Typography.Title>
			</Table.Summary.Cell>
			<Table.Summary.Cell index={1}> &nbsp; </Table.Summary.Cell>
			<Table.Summary.Cell index={2}> &nbsp;</Table.Summary.Cell>
			<Table.Summary.Cell index={3}> &nbsp; </Table.Summary.Cell>
			<Table.Summary.Cell index={4}>
				<Typography.Title level={3} style={{ fontWeight: 500, margin: ' 0px' }}>
					${totalBillAmount}
				</Typography.Title>
			</Table.Summary.Cell>
		</Table.Summary.Row>
	);

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
		if (isFreeTrial && !licensesData?.payload?.trialConvertedToSubscription) {
			updateCreditCard({
				licenseKey: activeLicense?.key || '',
				successURL: window.location.href,
				cancelURL: window.location.href,
			});
		} else {
			manageCreditCard({
				licenseKey: activeLicense?.key || '',
				successURL: window.location.href,
				cancelURL: window.location.href,
			});
		}
	}, [
		activeLicense?.key,
		isFreeTrial,
		licensesData?.payload?.trialConvertedToSubscription,
		manageCreditCard,
		updateCreditCard,
	]);

	return (
		<div className="billing-container">
			<Row
				justify="space-between"
				align="middle"
				gutter={[16, 16]}
				style={{
					margin: 0,
				}}
			>
				<Col span={20}>
					<Typography.Title level={4} ellipsis style={{ fontWeight: '300' }}>
						{headerText}
					</Typography.Title>

					{licensesData?.payload?.onTrial &&
						licensesData?.payload?.trialConvertedToSubscription && (
							<Typography.Title
								level={5}
								ellipsis
								style={{ fontWeight: '300', color: '#49aa19' }}
							>
								We have received your card details, your billing will only start after
								the end of your free trial period.
							</Typography.Title>
						)}
				</Col>

				<Col span={4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
					<Button
						type="primary"
						size="middle"
						loading={isLoadingBilling || isLoadingManageBilling}
						onClick={handleBilling}
					>
						{isFreeTrial && !licensesData?.payload?.trialConvertedToSubscription
							? 'Upgrade Plan'
							: 'Manage Billing'}
					</Button>
				</Col>
			</Row>

			<div className="billing-summary">
				<Typography.Title level={4} style={{ margin: '16px 0' }}>
					Current bill total
				</Typography.Title>

				<Typography.Title
					level={3}
					style={{ margin: '16px 0', display: 'flex', alignItems: 'center' }}
				>
					{billCurrency}
					{billAmount} &nbsp;
					{isFreeTrial ? <Tag color="success"> Free Trial </Tag> : ''}
				</Typography.Title>

				<Typography.Paragraph style={{ margin: '16px 0' }}>
					{daysRemaining} {daysRemainingStr}
				</Typography.Paragraph>
			</div>

			<div className="billing-details">
				{!isLoading && (
					<Table
						columns={columns}
						dataSource={data}
						pagination={false}
						summary={renderSummary}
					/>
				)}

				{isLoading && renderTableSkeleton()}
			</div>

			{isFreeTrial && !licensesData?.payload?.trialConvertedToSubscription && (
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
								Upgrade now to have uninterrupted access
							</Typography.Text>
							<Typography.Text className="plan-benefit">
								<CheckCircleOutlined />
								Your billing will start only after the trial period
							</Typography.Text>
							<Typography.Text className="plan-benefit">
								<CheckCircleOutlined />
								<span>
									Check out features in paid plans &nbsp;
									<a
										href="https://signoz.io/pricing/"
										style={{
											color: '#f99781',
										}}
										target="_blank"
										rel="noreferrer"
									>
										here
									</a>
								</span>
							</Typography.Text>
						</Col>
						<Col span={4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
							<Button type="primary" size="middle">
								Upgrade Plan
							</Button>
						</Col>
					</Row>
				</div>
			)}
		</div>
	);
}
