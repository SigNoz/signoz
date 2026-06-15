import { useMemo, useState } from 'react';
import { Input } from '@signozhq/ui/input';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import useDebounce from 'hooks/useDebounce';

import { FieldContext, FieldContextValue } from './types';

import './KeySearchInput.styles.scss';

const SUGGESTION_LIMIT = 50;
const DEBOUNCE_MS = 300;

interface KeySearchInputProps {
	value: string;
	fieldContext: FieldContextValue;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	testId?: string;
	onChange: (value: string) => void;
}

// Maps the mapper's attribute/resource context to the fields-endpoint context.
function toFieldsContext(
	context: FieldContextValue,
): TelemetrytypesFieldContextDTO {
	return context === FieldContext.resource
		? TelemetrytypesFieldContextDTO.resource
		: TelemetrytypesFieldContextDTO.attribute;
}

// Free-text input with span/resource key suggestions from /api/v1/fields/keys
// (signal=traces). Typing keeps the custom value; suggestions are assistive.
function KeySearchInput({
	value,
	fieldContext,
	placeholder,
	className,
	disabled,
	testId,
	onChange,
}: KeySearchInputProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const debouncedSearch = useDebounce(value, DEBOUNCE_MS);

	const { data, isFetching } = useGetFieldsKeys(
		{
			signal: TelemetrytypesSignalDTO.traces,
			fieldContext: toFieldsContext(fieldContext),
			searchText: debouncedSearch,
			limit: SUGGESTION_LIMIT,
		},
		{ query: { enabled: isOpen && !disabled, keepPreviousData: true } },
	);

	const suggestions = useMemo(() => {
		const keys = data?.data?.keys ?? {};
		return Object.keys(keys)
			.filter((key) => key !== value)
			.slice(0, SUGGESTION_LIMIT);
	}, [data, value]);

	return (
		<div className={cx('key-search', className)}>
			<Input
				placeholder={placeholder}
				value={value}
				disabled={disabled}
				autoComplete="off"
				onChange={(event): void => {
					onChange(event.target.value);
					setIsOpen(true);
				}}
				onFocus={(): void => setIsOpen(true)}
				onBlur={(): void => setIsOpen(false)}
				testId={testId}
			/>
			{isOpen && suggestions.length > 0 && (
				<div className="key-search__dropdown" data-testid={`${testId}-dropdown`}>
					{suggestions.map((name) => (
						<button
							type="button"
							key={name}
							className="key-search__option"
							// onMouseDown (not onClick) so selection runs before the input blur.
							onMouseDown={(event): void => {
								event.preventDefault();
								onChange(name);
								setIsOpen(false);
							}}
							data-testid={`${testId}-option-${name}`}
						>
							{name}
						</button>
					))}
				</div>
			)}
			{isOpen && isFetching && suggestions.length === 0 && (
				<div className="key-search__dropdown key-search__dropdown--empty">
					Searching…
				</div>
			)}
		</div>
	);
}

export default KeySearchInput;
