import { Col, ColProps, Row, RowProps } from 'antd';
import React from 'react';
import styled, {
	css,
	DefaultTheme,
	FlattenSimpleInterpolation,
	ThemedCssFunction,
} from 'styled-components';

import { IStyledClass } from './types';

const styledClass = (props: IStyledClass): FlattenSimpleInterpolation =>
	props.styledClass;

interface IStyledCol extends ColProps, IStyledClass {}
const StyledCol = styled(Col)<IStyledCol>`
	${styledClass}
`;

interface IStyledRow extends RowProps, IStyledClass {}
const StyledRow = styled(Row)<IStyledRow>`
	${styledClass}
`;

interface IStyledDiv
	extends React.HTMLAttributes<HTMLDivElement>,
		IStyledClass {}
const StyledDiv = styled.div<IStyledDiv>`
	${styledClass}
`;

export { StyledCol, StyledDiv, StyledRow };
