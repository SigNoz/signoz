import { memo } from 'react';
import { Typography } from 'antd';
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
					color: '#c0c1c3',
				}}
			>
				{label}
			</Typography>
		</StyledLabel>
	);
});
