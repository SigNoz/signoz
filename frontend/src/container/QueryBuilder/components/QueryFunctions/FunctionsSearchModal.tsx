import {
	ArrowDownOutlined,
	ArrowLeftOutlined,
	ArrowRightOutlined,
	ArrowUpOutlined,
	EnterOutlined,
} from '@ant-design/icons';
import { Button, Input } from 'antd';
import { QueryFunction } from 'api/v5/v5';
import classNames from 'classnames';
import {
	defaultFunctionDescription,
	functionTypes,
	logsQueryFunctionOptions,
	metricQueryFunctionOptions,
} from 'constants/queryFunctionOptions';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

type FunctionsSearchModalProps = {
	isOpen: boolean;
	onClose: () => void;
	query: IBuilderQuery;
	onSelectFunction: (fn: QueryFunction, index: number, value: string) => void;
	funcData: QueryFunction;
	index: number;
};

type FunctionsCategoriesProps = {
	categories: string[];
	activeIndex: number | null;
	onCategorySelect: (category: string) => void;
};

const FunctionsCategories = forwardRef<
	HTMLUListElement,
	FunctionsCategoriesProps
>(
	({ categories, activeIndex, onCategorySelect }, ref): JSX.Element => (
		<ul ref={ref} role="menu" className="functions-categories">
			{categories.map((category, index) => (
				<li
					key={category}
					className={classNames('functions-category-button', {
						active: activeIndex === index,
					})}
				>
					<button
						tabIndex={-1}
						role="menuitem"
						type="button"
						onClick={(): void => onCategorySelect(category)}
					>
						{category}
					</button>
				</li>
			))}
		</ul>
	),
);

FunctionsCategories.displayName = 'FunctionsCategories';

const Functions = forwardRef<
	HTMLDivElement,
	{
		functions: SelectOption<string, string>[];
		activeIndex: number | null;
		onSelectFunction: (fn: string) => void;
	}
>(
	({ functions, activeIndex, onSelectFunction }, ref): JSX.Element => (
		<div ref={ref}>
			{functions.map((fn, index) => (
				<button
					type="button"
					tabIndex={-1}
					onClick={(): void => onSelectFunction(fn.value)}
					key={fn.value}
					className={classNames('functions-function', {
						active: activeIndex === index,
					})}
				>
					{fn.label}
				</button>
			))}
		</div>
	),
);

Functions.displayName = 'Functions';

function FunctionDescription({
	selectedCategory,
}: {
	selectedCategory: keyof typeof defaultFunctionDescription;
}): JSX.Element {
	return (
		<p className="functions-function-description">
			{defaultFunctionDescription[selectedCategory]}
		</p>
	);
}

function FunctionsSearchModal(
	props: FunctionsSearchModalProps,
): JSX.Element | null {
	const [selectedCategory, setSelectedCategory] = useState<string>(
		functionTypes.arithmetic,
	);

	const functionsCategoriesRef = useRef<HTMLUListElement>(null);
	const functionsRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLSelectElement>(null);

	const [focusedElement, setFocusedElement] = useState<
		React.RefObject<HTMLUListElement> | React.RefObject<HTMLDivElement> | null
	>(null);

	const [activeFunctionIndex, setActiveFunctionIndex] = useState<number | null>(
		null,
	);
	const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(
		null,
	);
	const [categorySearch, setCategorySearch] = useState<string>('');

	const { isOpen, onClose, query, onSelectFunction, funcData, index } = props;

	const functionOptions =
		query.dataSource === DataSource.LOGS
			? logsQueryFunctionOptions
			: metricQueryFunctionOptions;
	const filteredFunctionOptions =
		query.dataSource === DataSource.LOGS
			? logsQueryFunctionOptions.filter(
					(option) => option.type === selectedCategory,
			  )
			: metricQueryFunctionOptions.filter(
					(option) => option.type === selectedCategory,
			  );

	const categories = Object.keys(
		functionOptions.reduce((acc, option) => {
			if (!option.type) return acc;
			acc[option.type] = acc[option.type] || [];
			acc[option.type].push(option);
			return acc;
		}, {} as Record<string, SelectOption<string, string>[]>),
	).filter((category) =>
		category.toLowerCase().includes(categorySearch.toLowerCase()),
	);

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
		const { key } = e;

		switch (key) {
			case 'ArrowDown':
				e.preventDefault();
				if (
					focusedElement?.current?.childNodes.length &&
					focusedElement === functionsCategoriesRef
				) {
					if (activeCategoryIndex === focusedElement.current.childNodes.length - 1) {
						setActiveCategoryIndex(0);
						setSelectedCategory(categories[0]);
					} else {
						setActiveCategoryIndex((prev) => (prev !== null ? prev + 1 : 0));
						setSelectedCategory(
							categories[activeCategoryIndex !== null ? activeCategoryIndex + 1 : 0],
						);
					}
				}
				if (
					focusedElement?.current?.childNodes.length &&
					focusedElement === functionsRef
				) {
					if (activeFunctionIndex === focusedElement.current.childNodes.length - 1) {
						setActiveFunctionIndex(0);
					} else {
						setActiveFunctionIndex((prev) => (prev !== null ? prev + 1 : 0));
					}
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (
					focusedElement?.current?.childNodes.length &&
					focusedElement === functionsCategoriesRef
				) {
					if (activeCategoryIndex === 0) {
						setActiveCategoryIndex(focusedElement.current.childNodes.length - 1);
						setSelectedCategory(
							categories[focusedElement.current.childNodes.length - 1],
						);
					} else {
						setActiveCategoryIndex((prev) => (prev !== null ? prev - 1 : 0));
						setSelectedCategory(
							categories[activeCategoryIndex !== null ? activeCategoryIndex - 1 : 0],
						);
					}
				}
				if (
					focusedElement === functionsRef &&
					focusedElement?.current?.childNodes.length
				) {
					if (activeFunctionIndex === 0) {
						setActiveFunctionIndex(focusedElement.current.childNodes.length - 1);
					} else {
						setActiveFunctionIndex((prev) => (prev !== null ? prev - 1 : 0));
					}
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				if (functionsRef.current) {
					setFocusedElement(functionsRef);
				}
				setActiveFunctionIndex(0);
				break;
			case 'ArrowLeft':
				e.preventDefault();
				if (functionsCategoriesRef.current) {
					setFocusedElement(functionsCategoriesRef);
				}
				setActiveCategoryIndex(0);
				setActiveFunctionIndex(0);
				break;

			case 'Enter':
				e.preventDefault();

				if (activeFunctionIndex !== null) {
					onSelectFunction(
						funcData,
						index,
						filteredFunctionOptions[activeFunctionIndex].value,
					);
				}
				onClose();
				break;
			case 'Tab':
			default:
				onClose();
				break;
		}
	};

	const onFocus = (): void => {
		console.log(functionsCategoriesRef.current);
		if (functionsCategoriesRef.current) {
			setFocusedElement(functionsCategoriesRef);
			setActiveCategoryIndex(0);
			setActiveFunctionIndex(0);
			functionsCategoriesRef.current.style.outline = '2px solid green';
		}
	};
	const onBlur = (): void => {
		if (focusedElement && focusedElement.current) {
			focusedElement.current.style.outline = 'none';
		}
		setActiveCategoryIndex(null);
		setActiveFunctionIndex(null);
		setFocusedElement(null);
	};

	useEffect(() => {
		let scrollTimeout: NodeJS.Timeout | null = null;

		const updatePosition = (): void => {
			if (containerRef.current && isOpen) {
				const viewHeight = window.innerHeight;
				const modalHeight = (25 * viewHeight) / 100;
				const rect = containerRef.current.getBoundingClientRect();
				const isTop = viewHeight - rect.bottom < modalHeight;
				if (isTop) {
					containerRef.current.style.top = '-25vh';
				} else {
					containerRef.current.style.top = '4vh';
				}
			}
		};

		const onScroll = (event: Event): void => {
			// Check if scroll event is from within the modal's children
			if (
				containerRef.current &&
				event.target instanceof Node &&
				containerRef.current.contains(event.target)
			) {
				return;
			}

			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
			scrollTimeout = setTimeout(() => {
				updatePosition();
			}, 150);
		};

		if (isOpen) {
			updatePosition();
			window.addEventListener('resize', updatePosition);
			window.addEventListener('scroll', onScroll, true);
		}

		return (): void => {
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', onScroll, true);
		};
	}, [isOpen]);

	const onChooseFunction = (fn: string): void => {
		onSelectFunction(funcData, index, fn);
		onClose();
	};

	const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setCategorySearch(e.target.value);
	};

	const onCategorySelect = (category: string): void => {
		setSelectedCategory(category);
	};

	if (!isOpen) return null;
	return (
		<section ref={containerRef} className="functions-search-modal">
			<header>
				<Input placeholder="Search for a function" onChange={onChange} />
			</header>
			<div
				onBlur={onBlur}
				tabIndex={0}
				role="menu"
				onFocus={onFocus}
				onKeyDown={onKeyDown}
				className="functions-search-modal-body"
			>
				<FunctionsCategories
					onCategorySelect={onCategorySelect}
					activeIndex={activeCategoryIndex}
					ref={functionsCategoriesRef}
					categories={categories}
				/>
				<Functions
					onSelectFunction={onChooseFunction}
					activeIndex={activeFunctionIndex}
					ref={functionsRef}
					functions={filteredFunctionOptions}
				/>
				<FunctionDescription selectedCategory={selectedCategory} />
			</div>
			<footer className="functions-search-modal-footer">
				<Button>
					<ArrowDownOutlined />
				</Button>
				<Button>
					<ArrowUpOutlined />
				</Button>
				<Button>
					<ArrowLeftOutlined />
				</Button>
				<Button>
					<ArrowRightOutlined />
				</Button>
				to navigate
				<div className="enter-btn">
					<Button>
						<EnterOutlined />
					</Button>
					to add function
				</div>
			</footer>
		</section>
	);
}

export default FunctionsSearchModal;
