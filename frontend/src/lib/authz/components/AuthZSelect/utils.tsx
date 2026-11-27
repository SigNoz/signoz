import type { BaseOptionType, DefaultOptionType } from 'antd/es/select';

import AuthZSelectLabel from './AuthZSelectLabel';
import type { AuthZSelectOption } from './types';

/** The option prop a selected tag shows, so a locked tag can carry its reason. */
export const TAG_LABEL_PROP = 'tagLabel';

const truncate = (text: string, maxLength?: number): string =>
	maxLength !== undefined && text.length > maxLength
		? `${text.slice(0, maxLength)}...`
		: text;

export const toSelectOption = (
	option: AuthZSelectOption,
	maxTagTextLength?: number,
): DefaultOptionType => ({
	value: option.value,
	label: option.label,
	disabled: option.disabled,
	reason: option.reason,
	denied: option.denied,
	// An empty title keeps the browser's own tooltip from doubling ours.
	title: option.reason ? '' : undefined,
	'aria-disabled': option.disabled,
	'aria-description': option.reason,
	'data-testid': option.testId,
	// A string lets the select truncate the tag itself.
	[TAG_LABEL_PROP]: option.reason ? (
		<AuthZSelectLabel reason={option.reason} denied={option.denied}>
			{truncate(option.label, maxTagTextLength)}
		</AuthZSelectLabel>
	) : (
		option.label
	),
});

export const renderOption = ({
	data,
}: {
	data: BaseOptionType;
}): JSX.Element => (
	<AuthZSelectLabel reason={data.reason} denied={data.denied}>
		{data.label}
	</AuthZSelectLabel>
);
