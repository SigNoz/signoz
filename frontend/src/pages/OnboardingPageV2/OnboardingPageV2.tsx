import './OnboardingPageV2.styles.scss';

import { Button, Col, Flex, Input, Layout, Row, Steps, Typography } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface OptionGroup {
	id: string; // Unique identifier for the group
	category: string; // The name of the category/group
	items: string[]; // The options under the category
}

interface Question {
	id: string; // Unique identifier for the question
	heading: string; // The main question text
	description: string; // A description providing context for the question
	options: OptionGroup[]; // Array of grouped options
	uiConfig?: {
		showSearch?: boolean; // Whether to show the search input
	}; // UI configuration options
}

const setupStepItems = [
	{
		title: 'Org Setup',
		description: 'ACME - Europe',
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

const questions: Question[] = [
	{
		id: 'question-block-1',
		heading: 'Select your data source',
		description:
			'Select from a host of services to start sending data to SigNoz.',
		options: [
			{
				id: 'category-1',
				category: 'Application Monitoring',
				items: ['Java', 'Python', 'Go', 'Node.js', 'Ruby', 'PHP'],
			},
			{
				id: 'category-2',
				category: 'Logs Monitoring',
				items: [
					'Kubernetes pods logs',
					'Docker container logs',
					'AWS CloudWatch',
					'ElasticSearch',
				],
			},
			{
				id: 'category-3',
				category: 'OpenTelemetry Collector',
				items: ['OTLP HTTP', 'OTLP GRPC'],
			},
			{
				id: 'category-4',
				category: 'Other Metrics',
				items: ['Host Metrics', 'Smart Agent Metrics'],
			},
			{
				id: 'category-5',
				category: 'AWS Metrics',
				items: [
					'AWS Application Logs',
					'AWS EC2 Metrics',
					'AWS ECS-Fargate',
					'AWS Lambda',
					'AWS Kinesis',
				],
			},
			{
				id: 'category-6',
				category: 'Azure Metrics',
				items: [
					'Azure Function',
					'Azure Container Logs',
					'Azure App Service',
					'AKS',
					'Azure Database Metrics',
					'Azure Blob Storage',
				],
			},
			{
				id: 'category-7',
				category: 'Datadog',
				items: ['Datadog Agent'],
			},
		],
		uiConfig: {
			showSearch: true,
		},
	},
	{
		id: 'question-block-2',
		heading: 'Which Java Framework Do You Use?',
		description: 'Descrption', // Description is inferred, might need adjustment
		options: [
			{
				id: 'qb-2-category-1',
				category: 'Java frameworks',
				items: ['Sping Boot', 'Tomact', 'JBoss', 'Others'],
			},
		],
	},
	{
		id: 'question-block-3',
		heading: 'Select your data source',
		description:
			'Select from a host of services to start sending data to SigNoz.',
		options: [
			{
				id: 'category-1',
				category: 'Application Monitoring',
				items: ['Java', 'Python', 'Go', 'Node.js', 'Ruby', 'PHP'],
			},
			{
				id: 'category-2',
				category: 'Logs Monitoring',
				items: [
					'Kubernetes pods logs',
					'Docker container logs',
					'AWS CloudWatch',
					'ElasticSearch',
				],
			},
			{
				id: 'category-3',
				category: 'OpenTelemetry Collector',
				items: ['OTLP HTTP', 'OTLP GRPC'],
			},
			{
				id: 'category-4',
				category: 'Other Metrics',
				items: ['Host Metrics', 'Smart Agent Metrics'],
			},
			{
				id: 'category-5',
				category: 'AWS Metrics',
				items: [
					'AWS Application Logs',
					'AWS EC2 Metrics',
					'AWS ECS-Fargate',
					'AWS Lambda',
					'AWS Kinesis',
				],
			},
			{
				id: 'category-6',
				category: 'Azure Metrics',
				items: [
					'Azure Function',
					'Azure Container Logs',
					'Azure App Service',
					'AKS',
					'Azure Database Metrics',
					'Azure Blob Storage',
				],
			},
			{
				id: 'category-7',
				category: 'Datadog',
				items: ['Datadog Agent'],
			},
		],
		uiConfig: {
			showSearch: false,
		},
	},
];

const questionnaireStepItems = questions.map((question) => ({
	id: question.id,
	title: question.heading,
	description: question.description,
	options: question.options,
	uiConfig: question.uiConfig,
}));
function OnboardingPageV2(): JSX.Element {
	const [answers, setAnswers] = useState<string[]>(
		new Array(questions.length).fill(''),
	);

	const [animatingOption, setAnimatingOption] = useState<string>('');
	const [currentQuestion, setCurrentQuestion] = useState(0);
	const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [searchQuery, setSearchQuery] = useState<string>('');

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchQuery(e.target.value.toLowerCase());
	};

	useEffect(() => {
		questionRefs.current = questionRefs.current.slice(0, questions.length);
	}, []);

	const handleOptionChange = (questionIndex: number, option: string): void => {
		const newAnswers = [...answers];
		newAnswers[questionIndex] = option;
		setAnswers(newAnswers);
		setAnimatingOption(option);

		setTimeout(() => setAnimatingOption(''), 600); // Reset animating state after animation completes

		setTimeout(() => {
			if (questionIndex < questions.length - 1) {
				setCurrentQuestion(questionIndex + 1);
				questionRefs.current[questionIndex + 1]?.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
				});
			}
		}, 500);
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

	return (
		<Layout>
			<Header className="setup-flow__header">header</Header>
			<Header
				className="setup-flow__header"
				style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%' }}
			>
				<Steps size="small" current={1} items={updatedSetupStepItems} />
			</Header>
			<Layout>
				<Row>
					<Col span={8}>
						<Content>
							<div className="setup-flow">
								{questionnaireStepItems.map((item, index) => (
									<div
										key={item.id}
										className={`setup-flow__question-block ${
											index <= currentQuestion ? 'setup-flow__question-block--active' : ''
										}`}
										ref={(el): void => {
											questionRefs.current[index] = el;
										}}
									>
										<Title level={4} className="setup-flow__content">
											{item.title}
										</Title>
										<Paragraph className="setup-flow__description">
											{item.description}
										</Paragraph>
										{item.uiConfig?.showSearch && (
											<Search
												placeholder="Search options"
												onChange={handleSearch}
												style={{ marginBottom: 16 }}
											/>
										)}
										<div className="setup-flow__radio-buttons">
											{item.options.map((group) => {
												const filteredOptions = group.items.filter((option) =>
													option.toLowerCase().includes(searchQuery),
												);
												if (filteredOptions.length === 0) return null;
												return (
													<React.Fragment key={group.id}>
														{group.category && (
															<div className="setup-flow__category">
																{group.category} ({filteredOptions.length})
															</div>
														)}

														{filteredOptions.map((option) => (
															<label key={`${group.id}-option`} className="radio-label">
																<input
																	type="radio"
																	name={`question-${index}`}
																	value={option}
																	checked={answers[index] === option}
																	onChange={(): void => handleOptionChange(index, option)}
																	className="setup-flow__radio-input"
																/>
																<span
																	className={`setup-flow__radio-custom ${
																		answers[index] === option
																			? 'setup-flow__radio-custom--pulse setup-flow__radio-custom--selected'
																			: ''
																	} ${
																		animatingOption === option
																			? 'setup-flow__radio-custom--animating'
																			: ''
																	}`}
																>
																	<Text>{option}</Text>
																</span>
															</label>
														))}
													</React.Fragment>
												);
											})}
											{item.uiConfig?.showSearch &&
												item.options.every((group) =>
													group.items.every(
														(option) => !option.toLowerCase().includes(searchQuery),
													),
												) && (
													<Flex gap={8} align="center" className="setup-flow__no-results">
														<Text>No results found for &ldquo;{searchQuery}&rdquo;</Text>
														<Button type="primary">
															Tell our team, we will help you out
														</Button>
													</Flex>
												)}
										</div>
									</div>
								))}
							</div>
						</Content>
					</Col>
				</Row>
			</Layout>
		</Layout>
	);
}

export default OnboardingPageV2;
