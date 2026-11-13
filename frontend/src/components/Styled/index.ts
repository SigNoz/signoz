import { HTMLAttributes } from 'react';
import {
	Button,
	ButtonProps,
	Col,
	ColProps,
	Row,
	RowProps,
	Space,
	SpaceProps,
} from 'antd';
import styled, { FlattenSimpleInterpolation } from 'styled-components';

import { IStyledClass } from './types';

const styledClass = (props: IStyledClass): FlattenSimpleInterpolation | null =>
	props.styledclass || null;

type TStyledCol = ColProps & IStyledClass;
const StyledCol = styled(Col)<TStyledCol>`
	${styledClass}
`;

type TStyledRow = RowProps & IStyledClass;
const StyledRow = styled(Row)<TStyledRow>`
	${styledClass}
`;

type TStyledSpace = SpaceProps & IStyledClass;
const StyledSpace = styled(Space)<TStyledSpace>`
	${styledClass}
`;

type TStyledButton = ButtonProps & IStyledClass;
const StyledButton = styled(Button)<TStyledButton>`
	${styledClass}
`;

type TStyledDiv = HTMLAttributes<HTMLDivElement> & IStyledClass;
const StyledDiv = styled.div<TStyledDiv>`
	${styledClass}
`;

export { StyledButton, StyledCol, StyledDiv, StyledRow, StyledSpace };
