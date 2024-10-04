import './OnboardingPageV2.styles.scss';

import { SearchOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Layout, Steps, Typography } from 'antd';
import { ArrowRight, Copy, Key, LifeBuoy, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import onboardingConfigWithLinks from './onboarding-config-with-links.json';
import OnboardingIngestionDetails from './OnboardingIngestionDetails';
import { questions } from './questions';

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

const setupStepItems = [
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
	{
		title: 'Preview',
	},
];

const questionnaireStepItems = questions.map((question) => ({
	id: question.id,
	title: question.title,
	description: question.description,
	options: question.options,
	uiConfig: question.uiConfig,
}));

function OnboardingAddDataSource(): JSX.Element {
	const [answers, setAnswers] = useState<string[]>(
		new Array(questions.length).fill(''),
	);

	const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [groupedDataSources, setGroupedDataSources] = useState<{
		[tag: string]: Entity[];
	}>({});

	const question2Ref = useRef<HTMLDivElement | null>(null);
	const question3Ref = useRef<HTMLDivElement | null>(null);
	const question4Ref = useRef<HTMLDivElement | null>(null);

	const [searchQuery, setSearchQuery] = useState<string>('');
	const [currentStep, setCurrentStep] = useState(1);

	const [hasMoreQuestions, setHasMoreQuestions] = useState<boolean>(true);

	const [docsUrl, setDocsUrl] = useState<string>(
		'http://localhost:3000/docs/instrumentation/springboot#send-traces-to-signoz-cloud',
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

	useEffect(() => {
		questionRefs.current = questionRefs.current.slice(0, questions.length);
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
		console.log('dataSource', dataSource);
		setSelectedDataSource(dataSource);
		setSelectedFramework(null);
		setSelectedEnvironment(null);

		if (dataSource.question) {
			setHasMoreQuestions(true);

			setTimeout(() => {
				question2Ref.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
					inline: 'nearest',
				});
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

	const handleSelectFramework = (selectedFramework: any, option: any): void => {
		console.log('selectedFramework', selectedFramework);
		setSelectedFramework(selectedFramework);

		if (selectedFramework.question) {
			setHasMoreQuestions(true);

			updateUrl(option?.link, null);

			setTimeout(() => {
				question3Ref.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
					inline: 'nearest',
				});
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
			question4Ref.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
				inline: 'nearest',
			});
		}, 100);
	};

	const updatedSetupStepItems = setupStepItems.map((item, index) => {
		if (index === 1) {
			// Assuming "Add your first data source" is at index 1
			return {
				...item,
				description: `${item.description} ${answers
					.slice(0, 5)
					.filter((answer) => answer)
					.join(', ')}`, // Assuming the first 5 questions are relevant
			};
		}
		return item;
	});

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
		setSearchQuery(query);

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

	return (
		<Layout>
			<div className="setup-flow__header">
				<div className="onboarding-header-container">
					<div className="header-left-section">
						<X size={14} color="#fff" />
						<Typography.Text>Get Started (2/4)</Typography.Text>
					</div>

					<div className="header-right-section">
						<Flex gap={8}>
							<Button size="middle" type="primary" shape="round">
								Get expert assistance
							</Button>
							<Button
								size="middle"
								className="periscope-btn"
								icon={<LifeBuoy size={14} />}
							>
								{' '}
								Get Help
							</Button>
						</Flex>
					</div>
				</div>
			</div>
			<Header
				className="setup-flow__header setup-flow__header--sticky"
				style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%' }}
			>
				<Steps size="small" current={currentStep} items={updatedSetupStepItems} />
			</Header>

			<div className="onboarding-product-setup-container">
				<div className="onboarding-product-setup-container_left-section">
					<div className="perlian-bg" />

					{currentStep === 1 && (
						<div
							className={`onboarding-add-data-source-container ${`step-${currentStep}`}`}
						>
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
																{/* {dataSource.imgUrl && ( */}
																<img
																	src={dataSource.imgUrl || '/Logos/signoz-brand-logo-new.svg'}
																	alt={dataSource.label}
																	className="onboarding-data-source-button-img"
																/>
																{/* )} */}
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
																onClick={(): void =>
																	handleSelectFramework(selectedDataSource.question, option)
																}
															>
																{/* {option.imgUrl && ( */}
																<img
																	src={option.imgUrl || '/Logos/signoz-brand-logo-new.svg'}
																	alt={option.label}
																	className="onboarding-data-source-button-img"
																/>
																{/* )} */}

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
												onClick={(): void => setCurrentStep(2)}
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
						<div className="onboarding-configure-container">
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
									onClick={(): void => setCurrentStep(1)}
								>
									Back
								</Button>
								<Button
									type="primary"
									shape="round"
									onClick={(): void => setCurrentStep(3)}
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
							>
								Invite a team member to help with this step
								<ArrowRight size={14} />
							</Button>
							<div className="need-help-section-content-divider">Or</div>
							<div className="need-help-section-content">
								<Typography.Text>
									Need help with setup? Upgrade now and get expert assistance.
								</Typography.Text>
								<Button
									type="default"
									shape="round"
									className="invite-user-section-content-button"
								>
									Get expert assistance
									<ArrowRight size={14} />
								</Button>
							</div>
						</div>
					)}

					{currentStep === 2 && <OnboardingIngestionDetails />}
				</div>
			</div>
		</Layout>
	);
}

export default OnboardingAddDataSource;
