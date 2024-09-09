import { Button, Flex, Input, Typography } from 'antd';
import React from 'react';

import { Question } from './OnboardingPageV2'; // Adjust the import path as necessary

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

interface QuestionBlockProps {
	item: Question;
	index: number;
	currentQuestion: number;
	answers: string[];
	handleOptionChange: (questionIndex: number, option: string) => void;
	animatingOption: string;
	searchQuery: string;
	handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
	questionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

function QuestionBlock({
	item,
	index,
	currentQuestion,
	answers,
	handleOptionChange,
	animatingOption,
	searchQuery,
	handleSearch,
	questionRefs,
}: QuestionBlockProps): JSX.Element {
	return (
		<div
			key={item.id}
			className={`setup-flow__question-block ${
				index <= currentQuestion ? 'setup-flow__question-block--active' : ''
			}`}
			ref={(el): void => {
				// eslint-disable-next-line no-param-reassign
				questionRefs.current[index] = el;
			}}
		>
			<Title level={4} className="setup-flow__content">
				{item.title}
			</Title>
			<Paragraph className="setup-flow__description">{item.description}</Paragraph>
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
								<label key={`${group.id}-option-${option}`} className="radio-label">
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
							<Button type="primary">Tell our team, we will help you out</Button>
						</Flex>
					)}
			</div>
		</div>
	);
}

export default QuestionBlock;
