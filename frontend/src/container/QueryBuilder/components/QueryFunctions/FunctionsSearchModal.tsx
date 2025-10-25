import {
	ArrowDownOutlined,
	ArrowLeftOutlined,
	ArrowRightOutlined,
	ArrowUpOutlined,
	EnterOutlined,
	SearchOutlined,
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
import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
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
	onCategorySelect: ({
		category,
		index,
	}: {
		category: string;
		index: number;
	}) => void;
};

const FunctionsCategories = forwardRef<
	HTMLUListElement,
	FunctionsCategoriesProps
>(
	({ categories, activeIndex, onCategorySelect }, ref): JSX.Element => {
		const onSelectCategory = (
			e: React.MouseEvent<HTMLButtonElement>,
			category: string,
			index: number,
		): void => {
			e.stopPropagation();
			onCategorySelect({ category, index });
		};
		return (
			<ul ref={ref} role="menu">
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
							className={classNames('functions-category-button-content', {
								active: activeIndex === index,
							})}
							onClick={(e): void => onSelectCategory(e, category, index)}
						>
							{category}
						</button>
					</li>
				))}
			</ul>
		);
	},
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
	selectedCategory: string;
}): JSX.Element {
	const description =
		selectedCategory in defaultFunctionDescription
			? defaultFunctionDescription[
					selectedCategory as keyof typeof defaultFunctionDescription
			  ]
			: '';
	return <p className="functions-function-description">{description}</p>;
}

function FunctionsSearchModal(
	props: FunctionsSearchModalProps,
): JSX.Element | null {
	const [selectedCategory, setSelectedCategory] = useState<string>(
		functionTypes.arithmetic,
	);

	const functionsCategoriesRef = useRef<HTMLUListElement>(null);
	const functionsRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const modalBodyRef = useRef<HTMLDivElement>(null);
	const firstTimeFocusRef = useRef<boolean>(false);

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

	const filteredFunctionOptions = useMemo(
		() =>
			query.dataSource === DataSource.LOGS
				? logsQueryFunctionOptions.filter(
						(option) => option.type === selectedCategory,
				  )
				: metricQueryFunctionOptions.filter(
						(option) => option.type === selectedCategory,
				  ),
		[query.dataSource, selectedCategory],
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

	const navigateCategoriesDown = (): void => {
		if (!focusedElement?.current?.childNodes.length) return;
		if (focusedElement !== functionsCategoriesRef) return;

		const isLastItem =
			activeCategoryIndex === focusedElement.current.childNodes.length - 1;
		const nextIndex = isLastItem ? 0 : (activeCategoryIndex ?? -1) + 1;

		setActiveCategoryIndex(nextIndex);
		setSelectedCategory(categories[nextIndex]);
	};

	const navigateFunctionsDown = (): void => {
		if (!focusedElement?.current?.childNodes.length) return;
		if (focusedElement !== functionsRef) return;

		const isLastItem =
			activeFunctionIndex === focusedElement.current.childNodes.length - 1;
		setActiveFunctionIndex(isLastItem ? 0 : (activeFunctionIndex ?? -1) + 1);
	};

	const navigateCategoriesUp = (): void => {
		if (!focusedElement?.current?.childNodes.length) return;
		if (focusedElement !== functionsCategoriesRef) return;

		const isFirstItem = activeCategoryIndex === 0;
		const previousIndex = isFirstItem
			? focusedElement.current.childNodes.length - 1
			: (activeCategoryIndex ?? 1) - 1;

		setActiveCategoryIndex(previousIndex);
		setSelectedCategory(categories[previousIndex]);
	};

	const navigateFunctionsUp = (): void => {
		if (!focusedElement?.current?.childNodes.length) return;
		if (focusedElement !== functionsRef) return;

		const isFirstItem = activeFunctionIndex === 0;
		setActiveFunctionIndex(
			isFirstItem
				? focusedElement.current.childNodes.length - 1
				: (activeFunctionIndex ?? 1) - 1,
		);
	};

	const moveFocusToFunctions = (): void => {
		if (!functionsRef.current) return;

		setFocusedElement(functionsRef);
		setActiveFunctionIndex(0);
	};

	const moveFocusToCategories = (): void => {
		if (!functionsCategoriesRef.current) return;

		setFocusedElement(functionsCategoriesRef);
		setActiveCategoryIndex(0);
		setActiveFunctionIndex(0);
	};

	const selectActiveFunction = (): void => {
		if (activeFunctionIndex === null) return;

		onSelectFunction(
			funcData,
			index,
			filteredFunctionOptions[activeFunctionIndex].value,
		);
		onClose();
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
		const { key } = e;

		switch (key) {
			case 'ArrowDown':
				e.preventDefault();
				navigateCategoriesDown();
				navigateFunctionsDown();
				break;
			case 'ArrowUp':
				e.preventDefault();
				navigateCategoriesUp();
				navigateFunctionsUp();
				break;
			case 'ArrowRight':
				e.preventDefault();
				moveFocusToFunctions();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				moveFocusToCategories();
				break;
			case 'Enter':
				e.preventDefault();
				selectActiveFunction();
				break;
			case 'Tab':
			default:
				onClose();
				break;
		}
	};

	const onFocus = (): void => {
		if (functionsCategoriesRef.current && !firstTimeFocusRef.current) {
			setFocusedElement(functionsCategoriesRef);
			setActiveCategoryIndex(0);
			setActiveFunctionIndex(0);
			firstTimeFocusRef.current = true;
		}
	};
	const onBlur = (): void => {
		setActiveCategoryIndex(null);
		setActiveFunctionIndex(null);
		setFocusedElement(null);
	};

	const calculateTopPosition = useCallback(
		(
			modalHeight: number,
			viewHeight: number,
			parentRect: DOMRect,
			parentHeight: number,
		): string => {
			const offsetFromTrigger = Math.max(8, viewHeight * 0.01);
			const spaceBelow = viewHeight - parentRect.bottom;
			const spaceAbove = parentRect.top;

			const needsToBeAbove = spaceBelow < modalHeight + offsetFromTrigger;
			const canFitAbove = spaceAbove >= modalHeight + offsetFromTrigger;

			if (needsToBeAbove && canFitAbove) {
				// Position above: modal should be above the parent button
				return `-${modalHeight + offsetFromTrigger}px`;
			}
			// Position below: modal should be below the parent button
			return `${parentHeight + offsetFromTrigger}px`;
		},
		[],
	);

	useEffect(() => {
		if (modalBodyRef.current && isOpen) {
			modalBodyRef.current.focus();
		}

		let scrollTimeout: NodeJS.Timeout | null = null;
		let isUpdating = false;

		const applyPosition = (): void => {
			if (!containerRef.current?.parentElement) return;

			const viewHeight = window.innerHeight;
			const modalHeight = containerRef.current.offsetHeight;
			const { parentElement } = containerRef.current;
			const parentRect = parentElement.getBoundingClientRect();
			const parentHeight = parentElement.offsetHeight;

			const topPosition = calculateTopPosition(
				modalHeight,
				viewHeight,
				parentRect,
				parentHeight,
			);
			containerRef.current.style.top = topPosition;
		};

		const updatePosition = (): void => {
			if (isUpdating) return;
			isUpdating = true;
			requestAnimationFrame(() => {
				applyPosition();
				isUpdating = false;
			});
		};

		const onScroll = (event: Event): void => {
			const isInternalScroll =
				containerRef.current &&
				event.target instanceof Node &&
				containerRef.current.contains(event.target);

			if (isInternalScroll) return;

			if (scrollTimeout) clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(updatePosition, 150);
		};

		setTimeout(updatePosition, 10);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', onScroll, true);

		return (): void => {
			if (scrollTimeout) clearTimeout(scrollTimeout);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', onScroll, true);
		};
	}, [isOpen, calculateTopPosition]);

	const onChooseFunction = (fn: string): void => {
		onSelectFunction(funcData, index, fn);
		onClose();
	};

	const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setCategorySearch(e.target.value);
	};

	const onCategorySelect = ({
		category,
		index,
	}: {
		category: string;
		index: number;
	}): void => {
		setActiveCategoryIndex(index);
		setSelectedCategory(category);
		setActiveFunctionIndex(0);
	};

	if (!isOpen) return null;
	return (
		<section ref={containerRef} className="functions-search-modal">
			<header>
				<Input
					prefix={
						<SearchOutlined size={14} style={{ color: '	var(--bg-slate-200)' }} />
					}
					size="large"
					placeholder="Search for a function"
					onChange={onChange}
				/>
			</header>
			<div
				ref={modalBodyRef}
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
				<Button tabIndex={-1} size="small">
					<ArrowDownOutlined />
				</Button>
				<Button tabIndex={-1} size="small">
					<ArrowUpOutlined />
				</Button>
				<Button tabIndex={-1} size="small">
					<ArrowLeftOutlined />
				</Button>
				<Button tabIndex={-1} size="small">
					<ArrowRightOutlined />
				</Button>
				to navigate
				<div className="enter-btn">
					<Button tabIndex={-1} size="small">
						<EnterOutlined />
					</Button>
					to add function
				</div>
			</footer>
		</section>
	);
}

export default FunctionsSearchModal;
