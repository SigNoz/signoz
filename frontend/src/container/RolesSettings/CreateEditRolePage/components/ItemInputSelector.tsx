import { useCallback, useRef, useState } from 'react';
import { Info, Plus, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';

import styles from './ItemInputSelector.module.scss';

const BASE_DOCS_URL =
	'https://signoz.io/docs/manage/administrator-guide/iam/permissions/';

export interface ItemInputSelectorProps {
	placeholder: string;
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	docsAnchor?: string;
	hasError?: boolean;
}

function parseInputValues(input: string): string[] {
	return input
		.split(/[\s,]+/)
		.map((v) => v.trim())
		.filter(Boolean);
}

function ItemInputSelector({
	placeholder,
	selectedIds,
	onChange,
	docsAnchor = 'role',
	hasError = false,
}: ItemInputSelectorProps): JSX.Element {
	const [inputValue, setInputValue] = useState('');
	const footerRef = useRef<HTMLDivElement>(null);

	const addValues = useCallback(
		(input: string): void => {
			const values = parseInputValues(input);
			if (values.length === 0) {
				return;
			}

			const existingSet = new Set(selectedIds);
			const newIds = values.filter((v) => !existingSet.has(v));

			if (newIds.length > 0) {
				onChange([...selectedIds, ...newIds]);
			}

			setInputValue('');
		},
		[selectedIds, onChange],
	);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			setInputValue(e.target.value);
		},
		[],
	);

	const handleInputKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>): void => {
			if (e.key === 'Enter') {
				e.preventDefault();
				addValues(inputValue);
			}
		},
		[inputValue, addValues],
	);

	const handleInputBlur = useCallback((): void => {
		addValues(inputValue);
	}, [inputValue, addValues]);

	const handleAddClick = useCallback((): void => {
		addValues(inputValue);
	}, [inputValue, addValues]);

	const handleRemove = useCallback(
		(itemId: string): void => {
			onChange(selectedIds.filter((id) => id !== itemId));
		},
		[selectedIds, onChange],
	);

	const handleBadgeKeyDown = useCallback(
		(
			e: React.KeyboardEvent<HTMLButtonElement>,
			itemId: string,
			index: number,
		): void => {
			if (e.key !== 'Enter' && e.key !== ' ') {
				return;
			}

			e.preventDefault();
			handleRemove(itemId);

			const targetIndex = index > 0 ? index - 1 : 0;
			requestAnimationFrame(() => {
				const buttons = footerRef.current?.querySelectorAll('button');
				const targetButton = buttons?.[targetIndex] as
					| HTMLButtonElement
					| undefined;
				targetButton?.focus();
			});
		},
		[handleRemove],
	);

	const showError = hasError && selectedIds.length === 0;

	return (
		<div
			className={cx(
				styles.itemInputSelector,
				showError ? styles.itemInputSelectorError : '',
			)}
			data-testid="item-input-selector"
		>
			<Input
				placeholder={placeholder}
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleInputKeyDown}
				onBlur={handleInputBlur}
				data-testid="item-input-selector-input"
				suffix={
					<Button
						variant="solid"
						size="sm"
						onClick={handleAddClick}
						disabled={!inputValue.trim()}
						data-testid="item-input-selector-add-btn"
					>
						<Plus size={14} />
						Add
					</Button>
				}
			/>

			{selectedIds.length > 0 ? (
				<div ref={footerRef} className={styles.itemInputSelectorFooter}>
					<div className={styles.itemInputSelectorBadges}>
						{selectedIds.map((id, index) => (
							<span key={id} className={styles.itemInputSelectorBadge} title={id}>
								<Typography
									as="span"
									size="small"
									truncate={1}
									className={styles.itemInputSelectorBadgeLabel}
								>
									{id}
								</Typography>
								<button
									type="button"
									className={styles.itemInputSelectorBadgeRemove}
									onClick={(): void => handleRemove(id)}
									onKeyDown={(e): void => handleBadgeKeyDown(e, id, index)}
									aria-label={`Remove ${id}`}
								>
									<X size={10} />
								</button>
							</span>
						))}
					</div>
					<TooltipSimple
						title={
							<Typography align="left">
								Still not sure on how to add selectors? <br />
								<Typography.Link
									href={`${BASE_DOCS_URL}#${docsAnchor}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									Check the docs
								</Typography.Link>{' '}
								to understand selectors for this resource.
							</Typography>
						}
					>
						<Info size={16} className={styles.itemInputSelectorInfoIcon} />
					</TooltipSimple>
				</div>
			) : (
				<Typography className={styles.itemInputSelectorHint}>
					Not sure what to type here?{' '}
					<Typography.Link
						href={`${BASE_DOCS_URL}#${docsAnchor}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						Check the docs
					</Typography.Link>{' '}
					to understand selectors for this resource.
				</Typography>
			)}
		</div>
	);
}

export default ItemInputSelector;
