import { CSSProperties, memo, useMemo } from 'react';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';

// ** Types
import { selectStyle } from '../QueryBuilderSearch/config';
import { OperatorsSelectProps } from './OperatorsSelect.interfaces';

export const OperatorsSelect = memo(function OperatorsSelect({
	operators,
	value,
	onChange,
	className,
	disabled,
	style,
	...props
}: OperatorsSelectProps): JSX.Element {
	const combinedStyle: CSSProperties = useMemo(
		() => ({
			...selectStyle,
			...style,
			...(disabled ? { opacity: 0.5, pointerEvents: 'none' as const } : {}),
		}),
		[disabled, style],
	);

	return (
		<ComboboxSimple
			items={operators as ComboboxSimpleItem[]}
			value={value || ''}
			onChange={(newValue): void => onChange(newValue as string)}
			style={combinedStyle}
			className={className}
			{...props}
		/>
	);
});
