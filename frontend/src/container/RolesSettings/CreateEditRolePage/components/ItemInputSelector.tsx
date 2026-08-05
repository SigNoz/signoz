import { useCallback, useRef, useState } from 'react';
import { Info, Plus } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
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
	testId: string;
	docsAnchor?: string;
	hasError?: boolean;
	prefixElement?: React.ReactNode;
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
	testId,
	docsAnchor = 'role',
	hasError = false,
	prefixElement,
}: ItemInputSelectorProps): JSX.Element {
	const [inputValue, setInputValue] = useState('');
	const badgesRef = useRef<HTMLDivElement>(null);

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

	const handleBadgeClose = useCallback(
		(e: React.MouseEvent, itemId: string, index: number): void => {
			e.preventDefault();
			handleRemove(itemId);

			// Activating a button via Enter/Space reports detail 0;
			// a real click reports 1 or more
			// Only trigger focus when using keyboard
			const isKeyboardActivation = e.detail === 0;

			if (!isKeyboardActivation) {
				return;
			}

			const targetIndex = index > 0 ? index - 1 : 0;
			requestAnimationFrame(() => {
				const buttons = badgesRef.current?.querySelectorAll('button');
				buttons?.[targetIndex]?.focus();
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
			data-testid={`item-input-selector-${testId}`}
		>
			<Input
				placeholder={placeholder}
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleInputKeyDown}
				onBlur={handleInputBlur}
				data-testid={`item-input-selector-input-${testId}`}
				prefix={prefixElement}
				suffix={
					<Button
						variant="solid"
						size="sm"
						onClick={handleAddClick}
						disabled={!inputValue.trim()}
						data-testid={`item-input-selector-add-btn-${testId}`}
					>
						<Plus size={14} />
						Add
					</Button>
				}
			/>

			{selectedIds.length > 0 ? (
				<div className={styles.itemInputSelectorFooter}>
					<div ref={badgesRef} className={styles.itemInputSelectorBadges}>
						{selectedIds.map((id, index) => (
							<Badge
								key={id}
								color="secondary"
								className={styles.itemInputSelectorBadge}
								testId={`item-badge-${testId}-${index}`}
								closable
								closeAriaLabel={`Remove ${id}`}
								onClose={(e): void => handleBadgeClose(e, id, index)}
							>
								<Typography as="span" size="small" truncate={1} title={id}>
									{id}
								</Typography>
							</Badge>
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
