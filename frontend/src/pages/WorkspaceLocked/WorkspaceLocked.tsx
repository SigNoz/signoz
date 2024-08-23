/* eslint-disable react/no-unescaped-entities */
import './WorkspaceLocked.styles.scss';

import type { TabsProps } from 'antd';
import {
	Alert,
	Button,
	Col,
	Collapse,
	Flex,
	List,
	Modal,
	Row,
	Skeleton,
	Space,
	Tabs,
	Typography,
} from 'antd';
import updateCreditCardApi from 'api/billing/checkout';
import logEvent from 'api/common/logEvent';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import useLicense from 'hooks/useLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { CircleArrowRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { sideBarCollapse } from 'store/actions/app/sideBarCollapse';
import { AppState } from 'store/reducers';
import { License } from 'types/api/licenses/def';
import AppReducer from 'types/reducer/app';
import { getFormattedDate } from 'utils/timeUtils';

import CustomerStoryCard from './CustomerStoryCard';
import InfoBlocks from './InfoBlocks';
import {
	customerStoriesData,
	enterpriseGradeValuesData,
	faqData,
	infoData,
} from './workspaceLocked.data';

export default function WorkspaceBlocked(): JSX.Element {
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const isAdmin = role === 'ADMIN';
	const [activeLicense, setActiveLicense] = useState<License | null>(null);
	const dispatch = useDispatch();
	const { notifications } = useNotifications();

	const {
		isFetching: isFetchingLicenseData,
		isLoading: isLoadingLicenseData,
		data: licensesData,
	} = useLicense();

	useEffect(() => {
		dispatch(sideBarCollapse(false));
	}, [dispatch]);

	useEffect(() => {
		if (!isFetchingLicenseData) {
			const shouldBlockWorkspace = licensesData?.payload?.workSpaceBlock;

			if (!shouldBlockWorkspace) {
				history.push(ROUTES.APPLICATION);
			}

			const activeValidLicense =
				licensesData?.payload?.licenses?.find(
					(license) => license.isCurrent === true,
				) || null;

			setActiveLicense(activeValidLicense);
		}
	}, [isFetchingLicenseData, licensesData]);

	const { mutate: updateCreditCard, isLoading } = useMutation(
		updateCreditCardApi,
		{
			onSuccess: (data) => {
				if (data.payload?.redirectURL) {
					const newTab = document.createElement('a');
					newTab.href = data.payload.redirectURL;
					newTab.target = '_blank';
					newTab.rel = 'noopener noreferrer';
					newTab.click();
				}
			},
			onError: () =>
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				}),
		},
	);

	const handleUpdateCreditCard = useCallback(async () => {
		logEvent('Workspace Blocked: User Clicked Update Credit Card', {});

		updateCreditCard({
			licenseKey: activeLicense?.key || '',
			successURL: window.location.origin,
			cancelURL: window.location.origin,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeLicense?.key, updateCreditCard]);

	const handleExtendTrial = (): void => {
		logEvent('Workspace Blocked: User Clicked Extend Trial', {});

		notifications.info({
			message: 'Extend Trial',
			duration: 0,
			description: (
				<Typography>
					If you have a specific reason why you were not able to finish your PoC in
					the trial period, please write to us on
					<a href="mailto:cloud-support@signoz.io"> cloud-support@signoz.io </a>
					with the reason. Sometimes we can extend trial by a few days on a case by
					case basis
				</Typography>
			),
		});
	};

	const renderCustomerStories = (
		filterCondition: (index: number) => boolean,
	): JSX.Element[] =>
		customerStoriesData
			.filter((_, index) => filterCondition(index))
			.map((story) => (
				<CustomerStoryCard
					avatar={story.avatar}
					personName={story.personName}
					role={story.role}
					message={story.message}
					link={story.link}
					key={story.key}
				/>
			));

	const tabItems: TabsProps['items'] = [
		{
			key: '1',
			label: 'Why choose Signoz',
			children: (
				<Row align="middle" justify="center">
					<Col span={12}>
						<Row gutter={[24, 48]}>
							<Col span={24}>
								<InfoBlocks items={infoData} />
							</Col>
							<Col span={24}>
								<Space size="large" direction="vertical">
									<Flex vertical>
										<Typography.Title level={3}>
											Enterprise-grade Observability
										</Typography.Title>
										<Typography>
											Get access to observability at any scale with advanced security and
											compliance.
										</Typography>
									</Flex>
									<List
										itemLayout="horizontal"
										dataSource={enterpriseGradeValuesData}
										renderItem={(item, index): React.ReactNode => (
											<List.Item key={index}>
												<List.Item.Meta avatar={<CircleArrowRight />} title={item.title} />
											</List.Item>
										)}
									/>
								</Space>
							</Col>
							{isAdmin && (
								<Col span={24}>
									<Button
										type="primary"
										shape="round"
										size="middle"
										loading={isLoading}
										onClick={handleUpdateCreditCard}
									>
										Continue to Upgrade
									</Button>
								</Col>
							)}
						</Row>
					</Col>
				</Row>
			),
		},
		{
			key: '2',
			label: 'Your are in good company',
			children: (
				<Row gutter={[24, 16]} justify="center">
					{/* #FIXME: please suggest if there is any better way to loop in different columns to get the masonry layout */}
					<Col span={10}>{renderCustomerStories((index) => index % 2 === 0)}</Col>
					<Col span={10}>{renderCustomerStories((index) => index % 2 !== 0)}</Col>
					{isAdmin && (
						<Col span={24}>
							<Flex justify="center">
								<Button
									type="primary"
									shape="round"
									size="middle"
									loading={isLoading}
									onClick={handleUpdateCreditCard}
								>
									Continue to Upgrade
								</Button>
							</Flex>
						</Col>
					)}
				</Row>
			),
		},
		// #TODO: comming soon
		// {
		// 	key: '3',
		// 	label: 'Our Pricing',
		// 	children: 'Our Pricing',
		// },
		{
			key: '4',
			label: 'FAQs',
			children: (
				<Row align="middle" justify="center">
					<Col span={18}>
						<Space size="large" direction="vertical">
							<Collapse items={faqData} defaultActiveKey={['1']} />
							{isAdmin && (
								<Button
									type="primary"
									shape="round"
									size="middle"
									loading={isLoading}
									onClick={handleUpdateCreditCard}
								>
									Continue to Upgrade
								</Button>
							)}
						</Space>
					</Col>
				</Row>
			),
		},
	];

	return (
		<div>
			<Modal
				className="workspace-locked__modal"
				title={
					<div className="workspace-locked__modal__header">
						<span className="workspace-locked__modal__title">Trial Plan Expired</span>
						<span className="workspace-locked__modal__header__actions">
							<Typography.Text className="workspace-locked__modal__title">
								Got Questions?
							</Typography.Text>
							<Button
								type="default"
								shape="round"
								size="middle"
								href="mailto:cloud-support@signoz.io"
							>
								Contact Us
							</Button>
						</span>
					</div>
				}
				open
				closable={false}
				footer={null}
				width="65%"
			>
				<div className="workspace-locked__container">
					{isLoadingLicenseData || !licensesData ? (
						<Skeleton />
					) : (
						<>
							<Row justify="center" align="middle">
								<Col>
									<Space direction="vertical" align="center">
										<Typography.Title level={2}>
											<div className="workspace-locked__title">Upgrade to Continue</div>
										</Typography.Title>
										<Typography.Paragraph className="workspace-locked__details">
											Upgrade now to keep enjoying all the great features you’ve been
											using.
											<br />
											Your data is safe with us until{' '}
											<span className="workspace-locked__details__highlight">
												{getFormattedDate(
													licensesData.payload?.gracePeriodEnd || Date.now(),
												)}
											</span>{' '}
											Act now to avoid any disruptions and continue where you left off.
										</Typography.Paragraph>
									</Space>
								</Col>
							</Row>
							{!isAdmin && (
								<Row justify="center">
									<Col>
										<Alert
											message="Contact your admin to proceed with the upgrade."
											type="info"
										/>
									</Col>
								</Row>
							)}
							{isAdmin && (
								<Row
									justify="center"
									align="middle"
									className="workspace-locked__modal__cta"
									gutter={[16, 16]}
								>
									<Col>
										<Button
											type="primary"
											shape="round"
											size="middle"
											loading={isLoading}
											onClick={handleUpdateCreditCard}
										>
											Continue My Journey
										</Button>
									</Col>
									<Col>
										<Button
											type="default"
											shape="round"
											size="middle"
											onClick={handleExtendTrial}
										>
											Need More Time?
										</Button>
									</Col>
								</Row>
							)}

							<Flex justify="center" className="workspace-locked__tabs">
								<Tabs items={tabItems} defaultActiveKey="2" />
							</Flex>
						</>
					)}
				</div>
			</Modal>
		</div>
	);
}
