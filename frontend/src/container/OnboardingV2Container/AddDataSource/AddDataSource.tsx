import '../OnboardingV2.styles.scss';

import { SearchOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Layout, Modal, Steps, Typography } from 'antd';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { ArrowRight, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import onboardingConfigWithLinks from '../configs/onboarding-config-with-links.json';
import OnboardingIngestionDetails from '../IngestionDetails/IngestionDetails';
import InviteTeamMembers from '../InviteTeamMembers/InviteTeamMembers';

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
	link?: string;
}

const setupStepItemsBase = [
	{
		title: 'Org Setup',
		description: '',
	},
	{
		title: 'Add your first data source',
		description: '',
	},
	{
		title: 'Configure Your Product',
	},
];

const ONBOARDING_V2_SCREEN = 'Onboarding V2';

function OnboardingAddDataSource(): JSX.Element {
	const [groupedDataSources, setGroupedDataSources] = useState<{
		[tag: string]: Entity[];
	}>({});

	const [setupStepItems, setSetupStepItems] = useState(setupStepItemsBase);

	const question2Ref = useRef<HTMLDivElement | null>(null);
	const question3Ref = useRef<HTMLDivElement | null>(null);
	const question4Ref = useRef<HTMLDivElement | null>(null);

	const [currentStep, setCurrentStep] = useState(1);

	const [hasMoreQuestions, setHasMoreQuestions] = useState<boolean>(true);

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

	const handleScrollToStep = (ref: React.RefObject<HTMLDivElement>): void => {
		setTimeout(() => {
			ref.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
				inline: 'nearest',
			});
		}, 100);
	};

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
		setSelectedDataSource(dataSource);
		setSelectedFramework(null);
		setSelectedEnvironment(null);

		if (dataSource.question) {
			setHasMoreQuestions(true);

			setTimeout(() => {
				handleScrollToStep(question2Ref);
			}, 100);
		} else {
			setHasMoreQuestions(false);

			updateUrl(dataSource?.link || '', null);

			setTimeout(() => {
				question4Ref.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
					inline: 'nearest',
				});
			}, 100);
		}
	};

	const handleSelectFramework = (option: any): void => {
		setSelectedFramework(option);

		if (option.question) {
			setHasMoreQuestions(true);

			updateUrl(option?.link, null);

			setTimeout(() => {
				handleScrollToStep(question3Ref);
			}, 100);
		} else {
			updateUrl(option.link, null);
			setHasMoreQuestions(false);
		}
	};

	const handleSelectEnvironment = (selectedEnvironment: any): void => {
		setSelectedEnvironment(selectedEnvironment);
		setHasMoreQuestions(false);

		updateUrl(docsUrl, selectedEnvironment?.key);

		setTimeout((): void => {
			handleScrollToStep(question4Ref);
		}, 100);
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

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const query = e.target.value.toLowerCase();

		if (query === '') {
			setGroupedDataSources(
				groupDataSourcesByTags(onboardingConfigWithLinks as Entity[]),
			);
			return;
		}

		const filteredDataSources = onboardingConfigWithLinks.filter(
			(dataSource) =>
				dataSource.label.toLowerCase().includes(query) ||
				dataSource.tags.some((tag) => tag.toLowerCase().includes(query)),
		);

		setGroupedDataSources(
			groupDataSourcesByTags(filteredDataSources as Entity[]),
		);
	};

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

	const handleUpdateCurrentStep = (step: number): void => {
		setCurrentStep(step);

		if (step === 2) {
			setSetupStepItems([
				...setupStepItemsBase.slice(0, 1),
				{
					...setupStepItemsBase[1],
					description: `${selectedDataSource?.label} ${
						selectedFramework?.label ? `- ${selectedFramework?.label}` : ''
						// eslint-disable-next-line sonarjs/no-nested-template-literals
					} ${selectedEnvironment?.label ? `- ${selectedEnvironment?.label}` : ''}`,
				},
				...setupStepItemsBase.slice(2),
			]);
		}

		if (step === 3) {
			history.push(ROUTES.APPLICATION);
		}
	};

	const handleShowInviteTeamMembersModal = (): void => {
		setShowInviteTeamMembersModal(true);
	};

	return (
		<div className="onboarding-v2">
			<Layout>
				<div className="setup-flow__header">
					<div className="onboarding-header-container">
						<div className="header-left-section">
							<X
								size={14}
								color="#fff"
								className="onboarding-header-container-close-icon"
								onClick={(): void => history.push(ROUTES.APPLICATION)}
							/>
							<Typography.Text>Get Started (2/4)</Typography.Text>
						</div>

						<div className="header-right-section">
							<Flex gap={8}>
								<LaunchChatSupport
									attributes={{
										dataSource: selectedDataSource?.dataSource,
										framework: selectedFramework?.label,
										environment: selectedEnvironment?.label,
										screen: ONBOARDING_V2_SCREEN,
									}}
									eventName="Onboarding V2: Facing Issues Sending Data to SigNoz"
									message=""
									buttonText="Get Expert Assistance"
									className="periscope-btn get-help-btn primary rounded-btn"
								/>
								<LaunchChatSupport
									attributes={{
										dataSource: selectedDataSource?.dataSource,
										framework: selectedFramework?.label,
										environment: selectedEnvironment?.label,
										screen: ONBOARDING_V2_SCREEN,
									}}
									eventName="Onboarding V2: Facing Issues Sending Data to SigNoz"
									message=""
									buttonText="Get Help"
									className="periscope-btn get-help-btn outlined"
								/>
							</Flex>
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
					<div className="onboarding-product-setup-container_left-section">
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
										<div className="question-1 data-sources-and-filters-container">
											<div className="data-sources-container">
												<div className="onboarding-data-source-search">
													<Input
														placeholder="Search"
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
											</div>

											<div className="data-source-categories-filter-container">
												<div className="onboarding-data-source-category">
													<Typography.Title level={5} className="onboarding-filters-title">
														{' '}
														Filters{' '}
													</Typography.Title>

													<Typography.Title
														level={5}
														className={`onboarding-filters-item-title ${
															selectedCategory === 'All' ? 'selected' : ''
														}`}
														onClick={(): void => handleFilterByCategory('All')}
													>
														All ({onboardingConfigWithLinks.length})
													</Typography.Title>

													{Object.keys(groupedDataSources).map((tag) => (
														<div key={tag} className="onboarding-data-source-category-item">
															<Typography.Title
																level={5}
																className={`onboarding-filters-item-title ${
																	selectedCategory === tag ? 'selected' : ''
																}`}
																onClick={(): void => handleFilterByCategory(tag)}
															>
																{tag} ({groupedDataSources[tag].length})
															</Typography.Title>
														</div>
													))}
												</div>
											</div>
										</div>

										{selectedDataSource && (
											<div
												className={`question-2 ${
													hasMoreQuestions ? 'full-viewport-height' : ''
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
															<Typography.Text className="question-sub-title">
																Select from a host of services to start sending data to SigNoz
															</Typography.Text>
														</div>

														<div className="onboarding-data-source-options">
															{selectedDataSource?.question?.options.map((option) => (
																<Button
																	key={option.label}
																	className={`onboarding-data-source-button ${
																		selectedFramework?.label === option.label ? 'selected' : ''
																	}`}
																	type="primary"
																	onClick={(): void => handleSelectFramework(option)}
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

										{selectedFramework && (
											<div
												className={`question-3 ${
													hasMoreQuestions ? 'full-viewport-height' : ''
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
															<Typography.Text className="question-sub-title">
																Select from a host of services to start sending data to SigNoz
															</Typography.Text>
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
																	{/* {option.imgUrl && ( */}
																	<img
																		src={option.imgUrl || '/Logos/signoz-brand-logo-new.svg'}
																		alt={option.label}
																		className="onboarding-data-source-button-img"
																	/>
																	{/* )}{' '} */}
																	{option.label}
																</Button>
															))}
														</div>
													</>
												)}
											</div>
										)}

										{!hasMoreQuestions && (
											<div className="question-4" ref={question4Ref}>
												<Button
													type="primary"
													disabled={!selectedDataSource}
													shape="round"
													onClick={(): void => handleUpdateCurrentStep(2)}
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
									<iframe
										title="docs"
										src={docsUrl}
										className="configure-product-docs-section-iframe"
										referrerPolicy="unsafe-url"
									/>
								</div>

								<div className="onboarding-footer">
									<Button
										type="default"
										shape="round"
										onClick={(): void => handleUpdateCurrentStep(1)}
									>
										Back
									</Button>
									<Button
										type="primary"
										shape="round"
										onClick={(): void => handleUpdateCurrentStep(3)}
									>
										Continue
									</Button>
								</div>
							</div>
						)}
					</div>

					<div className="onboarding-product-setup-container_right-section">
						{currentStep === 1 && (
							<div className="invite-user-section-content">
								<Button
									type="default"
									shape="round"
									className="invite-user-section-content-button"
									onClick={handleShowInviteTeamMembersModal}
								>
									Invite a team member to help with this step
									<ArrowRight size={14} />
								</Button>
								<div className="need-help-section-content-divider">Or</div>
								<div className="need-help-section-content">
									<Typography.Text>
										Need help with setup? Upgrade now and get expert assistance.
									</Typography.Text>

									<LaunchChatSupport
										attributes={{
											dataSource: selectedDataSource?.dataSource,
											framework: selectedFramework?.label,
											environment: selectedEnvironment?.label,
											screen: ONBOARDING_V2_SCREEN,
										}}
										eventName="Onboarding V2: Facing Issues Sending Data to SigNoz"
										message=""
										buttonText="Get Expert Assistance"
										className="periscope-btn get-help-btn rounded-btn outlined"
									/>
								</div>
							</div>
						)}

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
			</Layout>
		</div>
	);
}

export default OnboardingAddDataSource;
