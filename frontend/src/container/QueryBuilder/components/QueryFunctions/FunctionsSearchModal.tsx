import { QueryFunction } from 'api/v5/v5';
import classNames from 'classnames';
import {
	defaultFunctionDescription,
	functionTypes,
	logsQueryFunctionOptions,
	metricQueryFunctionOptions,
} from 'constants/queryFunctionOptions';
import { forwardRef, useRef, useState } from 'react';
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
};

const FunctionsCategories = forwardRef<
	HTMLUListElement,
	FunctionsCategoriesProps
>(
	({ categories, activeIndex }, ref): JSX.Element => (
		<ul ref={ref} role="menu" className="functions-categories">
			{categories.map((category, index) => (
				<li
					key={category}
					className={classNames('functions-category-button', {
						active: activeIndex === index,
					})}
				>
					{category}
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
	}
>(
	({ functions, activeIndex }, ref): JSX.Element => (
		<div ref={ref}>
			{functions.map((fn, index) => (
				<p
					key={fn.value}
					className={classNames('functions-function', {
						active: activeIndex === index,
					})}
				>
					{fn.label}
				</p>
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
	const [selectedCategory, setSelectedCategory] = useState<
		keyof typeof defaultFunctionDescription
	>(functionTypes.arithmetic);

	const functionsCategoriesRef = useRef<HTMLUListElement>(null);
	const functionsRef = useRef<HTMLDivElement>(null);

	const [focusedElement, setFocusedElement] = useState<
		React.RefObject<HTMLUListElement> | React.RefObject<HTMLDivElement> | null
	>(null);

	const [activeFunctionIndex, setActiveFunctionIndex] = useState<number | null>(
		null,
	);
	const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(
		null,
	);

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
					} else {
						setActiveCategoryIndex((prev) => (prev !== null ? prev + 1 : 0));
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
					} else {
						setActiveCategoryIndex((prev) => (prev !== null ? prev - 1 : 0));
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

	if (!isOpen) return null;
	return (
		<section className="functions-search-modal">
			<header>header</header>
			<div
				onBlur={onBlur}
				tabIndex={0}
				role="menu"
				onFocus={onFocus}
				onKeyDown={onKeyDown}
				className="functions-search-modal-body"
			>
				<FunctionsCategories
					activeIndex={activeCategoryIndex}
					ref={functionsCategoriesRef}
					categories={categories}
				/>
				<Functions
					activeIndex={activeFunctionIndex}
					ref={functionsRef}
					functions={filteredFunctionOptions}
				/>
				<FunctionDescription selectedCategory={selectedCategory} />
			</div>
			<footer>
				<button type="button" onClick={onClose}>
					Close
				</button>
			</footer>
		</section>
	);
}

export default FunctionsSearchModal;
