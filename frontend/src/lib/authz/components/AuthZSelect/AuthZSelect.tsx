import { useMemo } from 'react';
import { Select } from 'antd';

import type { AuthZSelectProps } from './types';
import { renderOption, TAG_LABEL_PROP, toSelectOption } from './utils';

/**
 * A multiple select whose options and selected tags explain why they are
 * locked: a denial on the red tooltip, or that the check is still running.
 * Feed it from `useLinkPickerAccess`.
 */
function AuthZSelect({
	options,
	maxTagTextLength,
	...props
}: AuthZSelectProps): JSX.Element {
	const selectOptions = useMemo(
		() => options.map((option) => toSelectOption(option, maxTagTextLength)),
		[options, maxTagTextLength],
	);

	return (
		<Select<string[]>
			optionFilterProp="label"

			{...props}
			mode="multiple"
			maxTagTextLength={maxTagTextLength}
			options={selectOptions}
			optionLabelProp={TAG_LABEL_PROP}
			optionRender={renderOption}
		/>
	);
}

export default AuthZSelect;
