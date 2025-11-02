import '../OnboardingV2.styles.scss';

import { SearchOutlined } from '@ant-design/icons';
import {
	Button,
	Flex,
	Input,
	Layout,
	Modal,
	Skeleton,
	Space,
	Steps,
	Typography,
} from 'antd';
import logEvent from 'api/common/logEvent';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import ROUTES from 'constants/routes';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import history from 'lib/history';
import { isEmpty } from 'lodash-es';
import { CheckIcon, Goal, UserPlus, X } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import OnboardingIngestionDetails from '../IngestionDetails/IngestionDetails';
import InviteTeamMembers from '../InviteTeamMembers/InviteTeamMembers';
import onboardingConfigWithLinks from '../onboarding-configs/onboarding-config-with-links.json';

const { Header } = Layout;

interface OptionGroup {
	id: string;
	category: string;
	items: string[];
}

export interface Question {
	id: string;
	title: string;
	description: string;
	options: OptionGroup[];
	uiConfig?: {
		showSearch?: boolean;
		filterByCategory?: boolean;
	};
}

interface Option {
	imgUrl?: string;
	label: string;
	link?: string;
	entityID?: string;
}

interface Entity {
	imgUrl?: string;
	label: string;
	dataSource: string;
	entityID: string;
	module: string;
	question?: {
		desc: string;
		options: Option[];
		entityID: string;
		question?: {
			desc: string;
			options: Option[];
			entityID: string;
		};
	};
	tags: string[];
	relatedSearchKeywords?: string[];
	link?: string;
	internalRedirect?: boolean;
}

const setupStepItemsBase = [
	{
		title: 'Org Setup',
		description: <Typography.Text>&nbsp;</Typography.Text>,
	},
	{
		title: 'Add your first data source',
		description: ' ',
	},
	{
		title: 'Configure Your Product',
		description: ' ',
	},
];

const ONBOARDING_V3_ANALYTICS_EVENTS_MAP = {
	BASE: 'Onboarding V3',
	STARTED: 'Started',
	DATA_SOURCE_SELECTED: 'Datasource selected',
	FRAMEWORK_SELECTED: 'Framework selected',
	ENVIRONMENT_SELECTED: 'Environment selected',
	CONFIGURED_PRODUCT: 'Configure clicked',
	BACK_BUTTON_CLICKED: 'Back clicked',
	CONTINUE_BUTTON_CLICKED: 'Continue clicked',
	GET_HELP_BUTTON_CLICKED: 'Get help clicked',
	GET_EXPERT_ASSISTANCE_BUTTON_CLICKED: 'Get expert assistance clicked',
	INVITE_TEAM_MEMBER_BUTTON_CLICKED: 'Invite team member clicked',
	CLOSE_ONBOARDING_CLICKED: 'Close onboarding clicked',
	DATA_SOURCE_REQUESTED: 'Datasource requested',
	DATA_SOURCE_SEARCHED: 'Searched',
};

// eslint-disable-next-line sonarjs/cognitive-complexity
function OnboardingAddDataSource(): JSX.Element {
	const [groupedDataSources, setGroupedDataSources] = useState<{
		[tag: string]: Entity[];
	}>({});

	const { org } = useAppContext();

	const [setupStepItems, setSetupStepItems] = useState(setupStepItemsBase);

	const [searchQuery, setSearchQuery] = useState<string>('');

	const question2Ref = useRef<HTMLDivElement | null>(null);
	const question3Ref = useRef<HTMLDivElement | null>(null);
	const configureProdRef = useRef<HTMLDivElement | null>(null);

	const [showConfigureProduct, setShowConfigureProduct] = useState<boolean>(
		false,
	);

	const [currentStep, setCurrentStep] = useState(1);

	const [dataSourceRequest, setDataSourceRequest] = useState<string>('');

	const [hasMoreQuestions, setHasMoreQuestions] = useState<boolean>(true);

	const [
		showRequestDataSourceModal,
		setShowRequestDataSourceModal,
	] = useState<boolean>(false);

	const [
		showInviteTeamMembersModal,
		setShowInviteTeamMembersModal,
	] = useState<boolean>(false);

	const [docsUrl, setDocsUrl] = useState<string>(
		'https://signoz.io/docs/instrumentation/',
	);

	const [selectedDataSource, setSelectedDataSource] = useState<Entity | null>(
		null,
	);

	const [selectedFramework, setSelectedFramework] = useState<Entity | null>(
		null,
	);

	const [selectedEnvironment, setSelectedEnvironment] = useState<Entity | null>(
		null,
	);

	const [selectedCategory, setSelectedCategory] = useState<string>('All');

	const [
		dataSourceRequestSubmitted,
		setDataSourceRequestSubmitted,
	] = useState<boolean>(false);

	const handleScrollToStep = (ref: React.RefObject<HTMLDivElement>): void => {
		setTimeout(() => {
			ref.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
				inline: 'nearest',
			});
		}, 100);
	};

	useEffect(() => {
		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.STARTED}`,
			{},
		);
	}, []);

	const updateUrl = (url: string, selectedEnvironment: string | null): void => {
		if (!url || url === '') {
			return;
		}

		// Step 1: Parse the URL
		const urlObj = new URL(url);

		// Step 2: Update or add the 'source' parameter
		urlObj.searchParams.set('source', 'onboarding');

		if (selectedEnvironment) {
			urlObj.searchParams.set('environment', selectedEnvironment);
		}

		// Step 3: Return the updated URL as a string
		const updatedUrl = urlObj.toString();

		setDocsUrl(updatedUrl);
	};

	const handleSelectDataSource = (dataSource: Entity): void => {
		if (dataSource && dataSource.internalRedirect && dataSource.link) {
			logEvent(
				`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.DATA_SOURCE_SELECTED}`,
				{
					dataSource: dataSource.label,
				},
			);
			history.push(dataSource.link);
		} else {
			setSelectedDataSource(dataSource);
			setSelectedFramework(null);
			setSelectedEnvironment(null);

			logEvent(
				`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.DATA_SOURCE_SELECTED}`,
				{
					dataSource: dataSource.label,
				},
			);

			if (dataSource.question) {
				setHasMoreQuestions(true);

				setTimeout(() => {
					handleScrollToStep(question2Ref);
				}, 100);
			} else {
				setHasMoreQuestions(false);

				updateUrl(dataSource?.link || '', null);

				setShowConfigureProduct(true);
			}
		}
	};

	const handleSelectFramework = (option: any): void => {
		setSelectedFramework(option);

		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.FRAMEWORK_SELECTED}`,
			{
				dataSource: selectedDataSource?.label,
				framework: option.label,
			},
		);

		if (option.question) {
			setHasMoreQuestions(true);

			updateUrl(option?.link, null);

			setTimeout(() => {
				handleScrollToStep(question3Ref);
			}, 100);
		} else {
			updateUrl(option.link, null);
			setHasMoreQuestions(false);

			setShowConfigureProduct(true);
		}
	};

	// Base Assumption:
	// Environment is the last question in the onboarding flow and no more question will be shown regarless of the configuration
	// We will have to handle this in the future
	const handleSelectEnvironment = (
		selectedEnvironment: any,
		baseURL?: string,
	): void => {
		setSelectedEnvironment(selectedEnvironment);
		setHasMoreQuestions(false);

		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.ENVIRONMENT_SELECTED}`,
			{
				dataSource: selectedDataSource?.label,
				framework: selectedFramework?.label,
				environment: selectedEnvironment?.label,
			},
		);

		updateUrl(baseURL || docsUrl, selectedEnvironment?.key);

		setShowConfigureProduct(true);
	};

	const groupDataSourcesByTags = (
		dataSources: Entity[],
	): { [tag: string]: Entity[] } => {
		const groupedDataSources: { [tag: string]: Entity[] } = {};

		dataSources.forEach((dataSource) => {
			dataSource.tags.forEach((tag) => {
				if (!groupedDataSources[tag]) {
					groupedDataSources[tag] = [];
				}
				groupedDataSources[tag].push(dataSource);
			});
		});

		return groupedDataSources;
	};

	useEffect(() => {
		const groupedDataSources = groupDataSourcesByTags(
			onboardingConfigWithLinks as Entity[],
		);

		setGroupedDataSources(groupedDataSources);
	}, []);

	const debouncedUpdate = useDebouncedFn((query) => {
		setSearchQuery(query as string);

		setDataSourceRequestSubmitted(false);

		if (query === '') {
			setGroupedDataSources(
				groupDataSourcesByTags(onboardingConfigWithLinks as Entity[]),
			);
			return;
		}

		const filteredDataSources = onboardingConfigWithLinks.filter(
			(dataSource) =>
				dataSource.label.toLowerCase().includes(query as string) ||
				dataSource.tags.some((tag) =>
					tag.toLowerCase().includes(query as string),
				) ||
				dataSource.relatedSearchKeywords?.some((keyword) =>
					keyword?.toLowerCase().includes(query as string),
				),
		);

		setGroupedDataSources(
			groupDataSourcesByTags(filteredDataSources as Entity[]),
		);

		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.DATA_SOURCE_SEARCHED}`,
			{
				searchedDataSource: query,
				resultCount: filteredDataSources.length,
			},
		);
	}, 300);

	const handleSearch = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const query = e.target.value.trim().toLowerCase();

			debouncedUpdate(query || '');
		},
		[debouncedUpdate],
	);
	const handleFilterByCategory = (category: string): void => {
		setSelectedDataSource(null);
		setSelectedFramework(null);
		setSelectedEnvironment(null);

		if (category === 'All') {
			setGroupedDataSources(
				groupDataSourcesByTags(onboardingConfigWithLinks as Entity[]),
			);

			setSelectedCategory('All');
			return;
		}

		const filteredDataSources = onboardingConfigWithLinks.filter(
			(dataSource) =>
				dataSource.tags.includes(category) ||
				dataSource.tags.some((tag) => tag.toLowerCase().includes(category)),
		);

		setSelectedCategory(category);

		setGroupedDataSources(
			groupDataSourcesByTags(filteredDataSources as Entity[]),
		);
	};

	useEffect(() => {
		setSetupStepItems([
			{
				...setupStepItemsBase[0],
				description: org?.[0]?.displayName || '',
			},
			...setupStepItemsBase.slice(1),
		]);
	}, [org]);

	const handleUpdateCurrentStep = (step: number): void => {
		setCurrentStep(step);

		if (step === 1) {
			setSetupStepItems([
				{
					...setupStepItemsBase[0],
					description: org?.[0]?.displayName || '',
				},
				{
					...setupStepItemsBase[1],
					description: '',
				},
				...setupStepItemsBase.slice(2),
			]);
		} else if (step === 2) {
			setSetupStepItems([
				{
					...setupStepItemsBase[0],
					description: org?.[0]?.displayName || '',
				},
				{
					...setupStepItemsBase[1],
					description: `${selectedDataSource?.label} ${
						selectedFramework?.label ? `- ${selectedFramework?.label}` : ''
					}`,
				},
				...setupStepItemsBase.slice(2),
			]);
		} else if (step === 3) {
			switch (selectedDataSource?.module) {
				case 'apm':
					history.push(ROUTES.APPLICATION);
					break;
				case 'logs':
					history.push(ROUTES.LOGS);
					break;
				case 'metrics':
					history.push(ROUTES.METRICS_EXPLORER);
					break;
				case 'dashboards':
					history.push(ROUTES.ALL_DASHBOARD);
					break;
				case 'infra-monitoring-hosts':
					history.push(ROUTES.INFRASTRUCTURE_MONITORING_HOSTS);
					break;
				case 'infra-monitoring-k8s':
					history.push(ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES);
					break;
				case 'messaging-queues-kafka':
					history.push(ROUTES.MESSAGING_QUEUES_KAFKA);
					break;
				case 'messaging-queues-celery':
					history.push(ROUTES.MESSAGING_QUEUES_CELERY_TASK);
					break;
				case 'integrations':
					history.push(ROUTES.INTEGRATIONS);
					break;
				case 'home':
					history.push(ROUTES.HOME);
					break;
				case 'api-monitoring':
					history.push(ROUTES.API_MONITORING);
					break;
				default:
					history.push(ROUTES.APPLICATION);
			}
		}
	};

	const handleShowInviteTeamMembersModal = (): void => {
		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.INVITE_TEAM_MEMBER_BUTTON_CLICKED}`,
			{
				dataSource: selectedDataSource?.label,
				framework: selectedFramework?.label,
				environment: selectedEnvironment?.label,
				currentPage: setupStepItems[currentStep]?.title || '',
			},
		);
		setShowInviteTeamMembersModal(true);
	};

	const handleSubmitDataSourceRequest = (): void => {
		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.DATA_SOURCE_REQUESTED}`,
			{
				requestedDataSource: dataSourceRequest,
			},
		);
		setShowRequestDataSourceModal(false);
		setDataSourceRequestSubmitted(true);
	};

	const handleRequestDataSource = (): void => {
		setShowRequestDataSourceModal(true);
	};

	const handleRaiseRequest = (): void => {
		logEvent(
			`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.DATA_SOURCE_REQUESTED}`,
			{
				requestedDataSource: searchQuery,
			},
		);

		setDataSourceRequestSubmitted(true);
	};

	const renderRequestDataSource = (): JSX.Element => {
		const isSearchQueryEmpty = searchQuery.length === 0;
		const isNoResultsFound = Object.keys(groupedDataSources).length === 0;

		return (
			<div className="request-data-source-container">
				{!isNoResultsFound && (
					<>
						<Typography.Text>Can’t find what you’re looking for?</Typography.Text>

						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="279"
							height="2"
							viewBox="0 0 279 2"
							fill="none"
						>
							<path
								d="M0 1L279 1"
								stroke="#7190F9"
								strokeOpacity="0.2"
								strokeDasharray="4 4"
							/>
						</svg>

						{!dataSourceRequestSubmitted && (
							<Button
								type="default"
								className="periscope-btn request-data-source-btn secondary"
								icon={<Goal size={16} />}
								onClick={handleRequestDataSource}
							>
								Request Data Source
							</Button>
						)}

						{dataSourceRequestSubmitted && (
							<Button
								type="default"
								className="periscope-btn request-data-source-btn success"
								icon={<CheckIcon size={16} />}
							>
								Request raised
							</Button>
						)}
					</>
				)}

				{isNoResultsFound && !isSearchQueryEmpty && (
					<>
						<Typography.Text>
							Our team can help add{' '}
							<span className="request-data-source-search-query">{searchQuery}</span>{' '}
							support for you
						</Typography.Text>

						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="279"
							height="2"
							viewBox="0 0 279 2"
							fill="none"
						>
							<path
								d="M0 1L279 1"
								stroke="#7190F9"
								strokeOpacity="0.2"
								strokeDasharray="4 4"
							/>
						</svg>

						{!dataSourceRequestSubmitted && (
							<Button
								type="default"
								className="periscope-btn request-data-source-btn secondary"
								icon={<Goal size={16} />}
								onClick={handleRaiseRequest}
							>
								Raise request
							</Button>
						)}

						{dataSourceRequestSubmitted && (
							<Button
								type="default"
								className="periscope-btn request-data-source-btn success"
								icon={<CheckIcon size={16} />}
							>
								Request raised
							</Button>
						)}
					</>
				)}
			</div>
		);
	};

	return (
		<div className="onboarding-v2">
			<Layout>
				<div className="setup-flow__header">
					<div className="onboarding-header-container">
						<div className="header-left-section">
							<X
								size={14}
								className="onboarding-header-container-close-icon"
								onClick={(): void => {
									logEvent(
										`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.CLOSE_ONBOARDING_CLICKED}`,
										{
											currentPage: setupStepItems[currentStep]?.title || '',
										},
									);

									history.push(ROUTES.HOME);
								}}
							/>
							<Typography.Text>Get Started (2/4)</Typography.Text>
						</div>

						<div className="header-right-section">
							<Button
								type="default"
								className="periscope-btn invite-teammate-btn outlined"
								onClick={handleShowInviteTeamMembersModal}
								icon={<UserPlus size={16} />}
							>
								Invite a teammate
							</Button>

							<LaunchChatSupport
								attributes={{
									dataSource: selectedDataSource?.dataSource,
									framework: selectedFramework?.label,
									environment: selectedEnvironment?.label,
									currentPage: setupStepItems[currentStep]?.title || '',
								}}
								eventName={`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.GET_HELP_BUTTON_CLICKED}`}
								message=""
								buttonText="Contact Support"
								className="periscope-btn get-help-btn outlined"
							/>
						</div>
					</div>
				</div>
				<Header
					className="setup-flow__header setup-flow__header--sticky"
					style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%' }}
				>
					<Steps
						size="small"
						className="setup-flow__steps"
						current={currentStep}
						items={setupStepItems}
					/>
				</Header>

				<div className="onboarding-product-setup-container">
					<div
						className={`onboarding-product-setup-container_left-section ${
							currentStep === 1 ? 'step-id-1' : 'step-id-2'
						}`}
					>
						<div className="perlian-bg" />

						{currentStep === 1 && (
							<div className="onboarding-add-data-source-container step-1">
								<div className="onboarding-data-sources-container">
									<div className="onboarding-question-header">
										<div className="question-title-container">
											<Typography.Title
												level={3}
												className="question-title onboarding-question"
											>
												Select your data source
											</Typography.Title>
											<Typography.Text className="question-sub-title">
												Select from a host of services to start sending data to SigNoz
											</Typography.Text>
										</div>
									</div>

									<div className="questionnaire-container">
										<div
											className={`question-1 question-block data-sources-and-filters-container ${
												selectedDataSource ? 'answered' : ''
											}`}
										>
											<div className="data-sources-container">
												<div className="onboarding-data-source-search">
													<Input
														placeholder="Search"
														maxLength={20}
														onChange={handleSearch}
														addonAfter={<SearchOutlined />}
													/>
												</div>

												{Object.keys(groupedDataSources).map((tag) => (
													<div key={tag} className="onboarding-data-source-group">
														<Typography.Title level={5} className="onboarding-title">
															{tag} ({groupedDataSources[tag].length})
														</Typography.Title>
														<div className="onboarding-data-source-list">
															{groupedDataSources[tag].map((dataSource) => (
																<Button
																	key={dataSource.dataSource}
																	className={`onboarding-data-source-button ${
																		selectedDataSource?.label === dataSource.label
																			? 'selected'
																			: ''
																	}`}
																	type="primary"
																	onClick={(): void => handleSelectDataSource(dataSource)}
																>
																	<img
																		src={dataSource.imgUrl}
																		alt={dataSource.label}
																		className="onboarding-data-source-button-img"
																	/>

																	{dataSource.label}
																</Button>
															))}
														</div>
													</div>
												))}

												{Object.keys(groupedDataSources).length === 0 && (
													<div className="no-results-found-container">
														<Typography.Text>No results for {searchQuery} :/</Typography.Text>
													</div>
												)}

												{!selectedDataSource && renderRequestDataSource()}
											</div>

											<div className="data-source-categories-filter-container">
												<div className="onboarding-data-source-category">
													<Typography.Title level={5} className="onboarding-filters-title">
														{' '}
														Filters{' '}
													</Typography.Title>

													<div
														key="all"
														className="onboarding-data-source-category-item"
														onClick={(): void => handleFilterByCategory('All')}
														role="button"
														tabIndex={0}
														onKeyDown={(e): void => {
															if (e.key === 'Enter' || e.key === ' ') {
																handleFilterByCategory('All');
															}
														}}
													>
														<Typography.Title
															level={5}
															className={`onboarding-filters-item-title ${
																selectedCategory === 'All' ? 'selected' : ''
															}`}
														>
															All
														</Typography.Title>

														<div className="line-divider" />

														<Typography.Text className="onboarding-filters-item-count">
															{onboardingConfigWithLinks.length}
														</Typography.Text>
													</div>

													{Object.keys(groupedDataSources).map((tag) => (
														<div
															key={tag}
															className="onboarding-data-source-category-item"
															onClick={(): void => handleFilterByCategory(tag)}
															role="button"
															tabIndex={0}
															onKeyDown={(e): void => {
																if (e.key === 'Enter' || e.key === ' ') {
																	handleFilterByCategory(tag);
																}
															}}
														>
															<Typography.Title
																level={5}
																className={`onboarding-filters-item-title ${
																	selectedCategory === tag ? 'selected' : ''
																}`}
															>
																{tag}
															</Typography.Title>

															<div className="line-divider" />

															<Typography.Text className="onboarding-filters-item-count">
																{groupedDataSources[tag].length}
															</Typography.Text>
														</div>
													))}
												</div>
											</div>
										</div>
										{selectedDataSource &&
											selectedDataSource?.question &&
											!isEmpty(selectedDataSource?.question) && (
												<div
													className={`question-2 question-block ${
														selectedFramework ? 'answered' : ''
													}`}
													ref={question2Ref}
												>
													{selectedDataSource?.question?.desc && (
														<>
															<div className="question-title-container">
																<Typography.Title
																	level={3}
																	className="question-title onboarding-text"
																>
																	{selectedDataSource?.question?.desc}
																</Typography.Title>
															</div>

															<div className="onboarding-data-source-options">
																{selectedDataSource?.question?.options.map((option) => (
																	<Button
																		key={option.label}
																		className={`onboarding-data-source-button ${
																			selectedFramework?.label === option.label ? 'selected' : ''
																		}`}
																		type="primary"
																		onClick={(): void => {
																			if (
																				selectedDataSource?.question?.entityID === 'environment'
																			) {
																				handleSelectEnvironment(option, option.link);
																			} else {
																				handleSelectFramework(option);
																			}
																		}}
																	>
																		{option.imgUrl && (
																			<img
																				src={option.imgUrl || '/Logos/signoz-brand-logo-new.svg'}
																				alt={option.label}
																				className="onboarding-data-source-button-img"
																			/>
																		)}

																		{option.label}
																	</Button>
																))}
															</div>
														</>
													)}
												</div>
											)}
										{selectedFramework &&
											selectedFramework?.question &&
											!isEmpty(selectedFramework?.question) && (
												<div
													className={`question-3 question-block ${
														selectedEnvironment ? 'answered' : ''
													}`}
													ref={question3Ref}
												>
													{selectedFramework?.question?.desc && (
														<>
															<div className="question-title-container">
																<Typography.Title
																	level={3}
																	className="question-title onboarding-text"
																>
																	{selectedFramework?.question?.desc}
																</Typography.Title>
															</div>

															<div className="onboarding-data-source-options">
																{selectedFramework?.question?.options.map((option) => (
																	<Button
																		key={option.label}
																		className={`onboarding-data-source-button ${
																			selectedEnvironment?.label === option.label ? 'selected' : ''
																		}`}
																		type="primary"
																		onClick={(): void => handleSelectEnvironment(option)}
																	>
																		<img
																			src={option.imgUrl || '/Logos/signoz-brand-logo-new.svg'}
																			alt={option.label}
																			className="onboarding-data-source-button-img"
																		/>
																		{option.label}
																	</Button>
																))}
															</div>
														</>
													)}
												</div>
											)}
										{!hasMoreQuestions && showConfigureProduct && (
											<div className="questionaire-footer" ref={configureProdRef}>
												<Button
													type="primary"
													disabled={!selectedDataSource}
													shape="round"
													onClick={(): void => {
														logEvent(
															`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.CONFIGURED_PRODUCT}`,
															{
																dataSource: selectedDataSource?.label,
																framework: selectedFramework?.label,
																environment: selectedEnvironment?.label,
															},
														);

														handleUpdateCurrentStep(2);
													}}
												>
													Next: Configure your product
												</Button>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{currentStep === 2 && (
							<div className="onboarding-configure-container step-2">
								<div className="configure-product-docs-section">
									<div className="loading-container">
										<Flex gap="middle" vertical>
											<Space align="end">
												<Skeleton.Avatar
													style={{ width: 40, height: 40 }}
													shape="square"
													active
												/>
											</Space>
											<Space align="start">
												<Skeleton.Button active size="small" block />
												<Skeleton.Input active size="small" />
												<Skeleton.Input active size="small" />
											</Space>

											<Skeleton.Button active size="small" block />
											<Skeleton.Button active size="small" block />
										</Flex>
									</div>
									<iframe
										title="docs"
										src={docsUrl}
										className="configure-product-docs-section-iframe"
										referrerPolicy="unsafe-url"
										loading="lazy"
										allow="clipboard-write; encrypted-media; web-share"
										allowFullScreen
									/>
								</div>

								<div className="onboarding-footer">
									<Button
										type="default"
										shape="round"
										onClick={(): void => {
											logEvent(
												`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BACK_BUTTON_CLICKED}`,
												{
													dataSource: selectedDataSource?.label,
													framework: selectedFramework?.label,
													environment: selectedEnvironment?.label,
													currentPage: setupStepItems[currentStep]?.title || '',
												},
											);

											handleUpdateCurrentStep(1);
										}}
									>
										Back
									</Button>
									<Button
										type="primary"
										shape="round"
										onClick={(): void => {
											logEvent(
												`${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.BASE}: ${ONBOARDING_V3_ANALYTICS_EVENTS_MAP?.CONTINUE_BUTTON_CLICKED}`,
												{
													dataSource: selectedDataSource?.label,
													framework: selectedFramework?.label,
													environment: selectedEnvironment?.label,
													currentPage: setupStepItems[currentStep]?.title || '',
												},
											);

											handleFilterByCategory('All');
											handleUpdateCurrentStep(3);
										}}
									>
										Continue
									</Button>
								</div>
							</div>
						)}
					</div>

					<div className="onboarding-product-setup-container_right-section">
						{currentStep === 2 && <OnboardingIngestionDetails />}
					</div>
				</div>

				<Modal
					className="invite-team-member-modal"
					title={<span className="title">Invite a team member</span>}
					open={showInviteTeamMembersModal}
					closable
					onCancel={(): void => setShowInviteTeamMembersModal(false)}
					width="640px"
					footer={null}
					destroyOnClose
				>
					<div className="invite-team-member-modal-content">
						<InviteTeamMembers
							isLoading={false}
							teamMembers={null}
							setTeamMembers={(): void => {}}
							onNext={(): void => setShowInviteTeamMembersModal(false)}
							onClose={(): void => setShowInviteTeamMembersModal(false)}
						/>
					</div>
				</Modal>

				<Modal
					className="request-data-source-modal"
					title={<span className="title">Request Data Source</span>}
					open={showRequestDataSourceModal}
					closable
					onCancel={(): void => setShowRequestDataSourceModal(false)}
					width="640px"
					footer={[
						<Button
							type="default"
							className="periscope-btn outlined"
							key="back"
							onClick={(): void => setShowRequestDataSourceModal(false)}
							icon={<X size={16} />}
						>
							Cancel
						</Button>,
						<Button
							key="submit"
							type="primary"
							className="periscope-btn primary"
							disabled={dataSourceRequest.length <= 0}
							onClick={handleSubmitDataSourceRequest}
							icon={<CheckIcon size={16} />}
						>
							Submit request
						</Button>,
					]}
					destroyOnClose
				>
					<div className="request-data-source-modal-content">
						<Typography.Text>Enter your request</Typography.Text>
						<Input
							placeholder="Eg: Kotlin"
							className="request-data-source-modal-input"
							onChange={(e): void => setDataSourceRequest(e.target.value)}
						/>
					</div>
				</Modal>
			</Layout>
		</div>
	);
}

export default OnboardingAddDataSource;
