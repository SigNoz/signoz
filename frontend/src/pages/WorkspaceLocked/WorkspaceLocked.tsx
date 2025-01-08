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
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { CircleArrowRight } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { License } from 'types/api/licenses/def';
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
	const { user, licenses, isFetchingLicenses } = useAppContext();
	const isAdmin = user.role === 'ADMIN';
	const [activeLicense, setActiveLicense] = useState<License | null>(null);
	const { notifications } = useNotifications();

	const { t } = useTranslation(['workspaceLocked']);

	useEffect((): void => {
		logEvent('Workspace Blocked: Screen Viewed', {});
	}, []);

	const handleContactUsClick = (): void => {
		logEvent('Workspace Blocked: Contact Us Clicked', {});
	};

	const handleTabClick = (key: string): void => {
		logEvent('Workspace Blocked: Screen Tabs Clicked', { tabKey: key });
	};

	const handleCollapseChange = (key: string | string[]): void => {
		const lastKey = Array.isArray(key) ? key.slice(-1)[0] : key;
		logEvent('Workspace Blocked: Screen Tab FAQ Item Clicked', {
			panelKey: lastKey,
		});
	};

	useEffect(() => {
		if (!isFetchingLicenses) {
			const shouldBlockWorkspace = licenses?.workSpaceBlock;

			if (!shouldBlockWorkspace) {
				history.push(ROUTES.APPLICATION);
			}

			const activeValidLicense =
				licenses?.licenses?.find((license) => license.isCurrent === true) || null;

			setActiveLicense(activeValidLicense);
		}
	}, [isFetchingLicenses, licenses]);

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
					message: t('somethingWentWrong'),
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
			message: t('extendTrial'),
			duration: 0,
			description: (
				<Typography>
					{t('extendTrialMsgPart1')}{' '}
					<a href="mailto:cloud-support@signoz.io">cloud-support@signoz.io</a>{' '}
					{t('extendTrialMsgPart2')}
				</Typography>
			),
		});
	};

	const handleViewBilling = (): void => {
		logEvent('Workspace Blocked: User Clicked View Billing', {});

		history.push(ROUTES.BILLING);
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
			key: 'whyChooseSignoz',
			label: t('whyChooseSignoz'),
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
											{t('enterpriseGradeObservability')}
										</Typography.Title>
										<Typography>{t('observabilityDescription')}</Typography>
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
										{t('continueToUpgrade')}
									</Button>
								</Col>
							)}
						</Row>
					</Col>
				</Row>
			),
		},
		{
			key: 'youAreInGoodCompany',
			label: t('youAreInGoodCompany'),
			children: (
				<Row gutter={[24, 16]} justify="center">
					{/* #FIXME: please suggest if there is any better way to loop in different columns to get the masonry layout */}
					<Col
						span={10}
						className="workspace-locked__customer-stories__left-container"
					>
						{renderCustomerStories((index) => index % 2 === 0)}
					</Col>
					<Col
						span={10}
						className="workspace-locked__customer-stories__right-container"
					>
						{renderCustomerStories((index) => index % 2 !== 0)}
					</Col>
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
									{t('continueToUpgrade')}
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
			key: 'faqs',
			label: t('faqs'),
			children: (
				<Row align="middle" justify="center">
					<Col span={12}>
						<Space
							size="large"
							direction="vertical"
							className="workspace-locked__faq-container"
						>
							<Collapse
								items={faqData}
								defaultActiveKey={['signoz-cloud-vs-community']}
								onChange={handleCollapseChange}
							/>
							{isAdmin && (
								<Button
									type="primary"
									shape="round"
									size="middle"
									loading={isLoading}
									onClick={handleUpdateCreditCard}
								>
									{t('continueToUpgrade')}
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
				rootClassName="workspace-locked__modal"
				title={
					<div className="workspace-locked__modal__header">
						<span className="workspace-locked__modal__title">
							{t('trialPlanExpired')}
						</span>
						<span className="workspace-locked__modal__header__actions">
							{isAdmin && (
								<Button
									className="workspace-locked__modal__header__actions__billing"
									type="link"
									size="small"
									role="button"
									onClick={handleViewBilling}
								>
									View Billing
								</Button>
							)}

							<Typography.Text className="workspace-locked__modal__title">
								Got Questions?
							</Typography.Text>
							<Button
								type="default"
								shape="round"
								size="middle"
								href="mailto:cloud-support@signoz.io"
								role="button"
								onClick={handleContactUsClick}
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
					{isFetchingLicenses || !licenses ? (
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
											{t('upgradeNow')}
											<br />
											{t('yourDataIsSafe')}{' '}
											<span className="workspace-locked__details__highlight">
												{getFormattedDate(licenses?.gracePeriodEnd || Date.now())}
											</span>{' '}
											{t('actNow')}
										</Typography.Paragraph>
									</Space>
								</Col>
							</Row>
							{!isAdmin && (
								<Row
									justify="center"
									align="middle"
									className="workspace-locked__modal__cta"
									gutter={[16, 16]}
								>
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
											Continue my Journey
										</Button>
									</Col>
									<Col>
										<Button
											type="default"
											shape="round"
											size="middle"
											onClick={handleExtendTrial}
										>
											{t('needMoreTime')}
										</Button>
									</Col>
								</Row>
							)}

							<div className="workspace-locked__tabs">
								<Tabs
									items={tabItems}
									defaultActiveKey="youAreInGoodCompany"
									onTabClick={handleTabClick}
								/>
							</div>
						</>
					)}
				</div>
			</Modal>
		</div>
	);
}
