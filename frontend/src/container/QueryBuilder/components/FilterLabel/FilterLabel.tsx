import React from 'react';

// ** Types
import { FilterLabelProps } from './FilterLabel.interfaces';
// ** Styles
import { StyledLabel } from './FilterLabel.styled';

export function FilterLabel({ label }: FilterLabelProps): JSX.Element {
	return <StyledLabel>{label}</StyledLabel>;
}
