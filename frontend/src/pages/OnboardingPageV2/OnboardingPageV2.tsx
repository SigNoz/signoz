import './OnboardingPageV2.styles.scss';

import { Button, Col, Flex, Layout, Row, Steps } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

import QuestionBlock from './QuestionBlock';
import { questions } from './questions';

const { Header, Content } = Layout;

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

const questionnaireStepItems = questions.map((question) => ({
	id: question.id,
	title: question.title,
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

		console.log(`Question ${questionIndex + 1} Answer: ${option}`);
		console.log('Current Form Output:', newAnswers);

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
			<Header className="setup-flow__header">
				<Flex justify="space-between">
					<div>Get Started (2/4)</div>
					<Flex gap={8}>
						<Button size="middle" type="primary">
							Get expert Assistance
						</Button>
						<Button size="middle">Help</Button>
					</Flex>
				</Flex>
			</Header>
			<Header
				className="setup-flow__header setup-flow__header--sticky"
				style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%' }}
			>
				<Steps size="small" current={1} items={updatedSetupStepItems} />
			</Header>
			<Layout>
				<Row>
					<Col span={16}>
						<Content>
							<div className="setup-flow">
								{questionnaireStepItems.map((item, index) => (
									<QuestionBlock
										key={item.id}
										item={item}
										index={index}
										currentQuestion={currentQuestion}
										answers={answers}
										handleOptionChange={handleOptionChange}
										animatingOption={animatingOption}
										searchQuery={searchQuery}
										handleSearch={handleSearch}
										questionRefs={questionRefs}
									/>
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
