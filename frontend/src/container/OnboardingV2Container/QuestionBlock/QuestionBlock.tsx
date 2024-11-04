import { SearchOutlined } from '@ant-design/icons';
import { Avatar, Button, Flex, Input, Typography } from 'antd';
import React, { useState } from 'react';

import { Question } from '../AddDataSource/AddDataSource'; // Adjust the import path as necessary

const { Title, Paragraph, Text } = Typography;

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
	const [selectedCategory, setSelectedCategory] = useState<string>('All');

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	const handleCategoryClick = (category: string): void => {
		setSelectedCategory(category);
	};

	const filteredGroups = item.options.filter(
		(group) => selectedCategory === 'All' || group.category === selectedCategory,
	);

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

			<div className="setup-flow__content-container">
				<div className="left-content">
					{item.uiConfig?.showSearch && (
						<Input
							placeholder="Kubernetes, AWS, React JS ...."
							size="large"
							prefix={<SearchOutlined style={{ color: '#C0C1C3' }} />}
							onChange={handleSearch}
							style={{ marginBottom: 16 }}
							className="setup-flow__search"
						/>
					)}
					<Flex vertical gap={48} className="setup-flow__radio-buttons">
						{filteredGroups.map((group) => {
							const filteredOptions = group.items.filter((option) =>
								option.toLowerCase().includes(searchQuery),
							);
							if (filteredOptions.length === 0) return null;
							return (
								<Flex gap={8} vertical key={group.id}>
									{group.category && (
										<div className="setup-flow__category">
											{group.category} ({filteredOptions.length})
										</div>
									)}

									<Flex gap={14} wrap="wrap">
										{filteredOptions.map((option) => (
											<label
												key={`${group.id}-option-${option}`}
												className="setup-flow__radio-label"
											>
												<input
													type="radio"
													name={`question-${index}`}
													value={option}
													checked={answers[index] === option}
													onChange={(): void => handleOptionChange(index, option)}
													className="setup-flow__radio-input"
												/>
												<Flex
													align="center"
													gap={8}
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
													<Avatar size={24} />
													<Text className="setup-flow__radio-custom__text">{option}</Text>
												</Flex>
											</label>
										))}
									</Flex>
								</Flex>
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
					</Flex>
				</div>
				<div className="right-content">
					{item.uiConfig?.filterByCategory && (
						<Flex vertical align="flex-start" className="setup-flow__category-filter">
							<Button
								type="text"
								ghost
								className={`setup-flow__category-filter-item ${
									selectedCategory === 'All'
										? 'setup-flow__category-filter-item--selected'
										: ''
								}`}
								// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
								onClick={() => handleCategoryClick('All')}
							>
								All ({item.options.reduce((acc, group) => acc + group.items.length, 0)})
							</Button>
							{item.options.map((group) => (
								<Button
									type="text"
									ghost
									key={group.id}
									className={`setup-flow__category-filter-item ${
										selectedCategory === group.category
											? 'setup-flow__category-filter-item--selected'
											: ''
									}`}
									// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
									onClick={() => handleCategoryClick(group.category)}
								>
									{group.category} ({group.items.length})
								</Button>
							))}
						</Flex>
					)}
				</div>
			</div>
		</div>
	);
}

export default QuestionBlock;
