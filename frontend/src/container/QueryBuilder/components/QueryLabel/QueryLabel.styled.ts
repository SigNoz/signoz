import { Select } from 'antd';
import styled, { css } from 'styled-components';

// ** Types
import { DropdownLabel } from './QueryLabel.interfaces';

const LabelStyle = css`
	width: fit-content;
	min-width: 5.75rem;
`;

export const StyledSingleLabel = styled(Select)`
	pointer-events: none;
	${LabelStyle}
`;

export const StyledDropdownLabel = styled(Select)<DropdownLabel>`
	${LabelStyle}
`;
