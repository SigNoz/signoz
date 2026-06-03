import { memo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { useIsDarkMode } from 'hooks/useDarkMode';

// ** Types
import { FilterLabelProps } from './FilterLabel.interfaces';
// ** Styles
import { StyledLabel } from './FilterLabel.styled';

export const FilterLabel = memo(function FilterLabel({
	label,
}: FilterLabelProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<StyledLabel isDarkMode={isDarkMode}>
			<Typography
				style={{
					color: 'var(--bg-vanilla-400)',
				}}
			>
				{label}
			</Typography>
		</StyledLabel>
	);
});
