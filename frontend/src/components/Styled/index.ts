import * as AntD from 'antd';
import { TextProps } from 'antd/lib/typography/Text';
import { TitleProps } from 'antd/lib/typography/Title';
import React from 'react';
import styled, {
	css,
	DefaultTheme,
	FlattenSimpleInterpolation,
	ThemedCssFunction,
} from 'styled-components';

import { IStyledClass } from './types';

const styledClass = (props: IStyledClass): FlattenSimpleInterpolation =>
	props.styledclass;

interface IStyledCol extends AntD.ColProps, IStyledClass {}
const StyledCol = styled(AntD.Col)<IStyledCol>`
	${styledClass}
`;

interface IStyledRow extends AntD.RowProps, IStyledClass {}
const StyledRow = styled(AntD.Row)<IStyledRow>`
	${styledClass}
`;

interface IStyledDivider extends AntD.DividerProps, IStyledClass {}
const StyledDivider = styled(AntD.Divider)<IStyledDivider>`
	${styledClass}
`;

interface IStyledSpace extends AntD.SpaceProps, IStyledClass {}
const StyledSpace = styled(AntD.Space)<IStyledSpace>`
	${styledClass}
`;

interface IStyledTabs extends AntD.TabsProps, IStyledClass {}
const StyledTabs = styled(AntD.Divider)<IStyledTabs>`
	${styledClass}
`;

interface IStyledButton extends AntD.ButtonProps, IStyledClass {}
const StyledButton = styled(AntD.Button)<IStyledButton>`
	${styledClass}
`;

const { Text } = AntD.Typography;
interface IStyledTypographyText extends TextProps, IStyledClass {}
const StyledTypographyText = styled(Text)<IStyledTypographyText>`
	${styledClass}
`;

const { Title } = AntD.Typography;
interface IStyledTypographyTitle extends TitleProps, IStyledClass {}
const StyledTypographyTitle = styled(Title)<IStyledTypographyTitle>`
	${styledClass}
`;

interface IStyledDiv
	extends React.HTMLAttributes<HTMLDivElement>,
		IStyledClass {}
const StyledDiv = styled.div<IStyledDiv>`
	${styledClass}
`;

const StyledTypography = {
	Text: StyledTypographyText,
	Title: StyledTypographyTitle,
};
export {
	StyledButton,
	StyledCol,
	StyledDiv,
	StyledDivider,
	StyledRow,
	StyledSpace,
	StyledTabs,
	StyledTypography,
};
