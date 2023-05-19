import * as AntD from 'antd';
import { TextProps } from 'antd/lib/typography/Text';
import { TitleProps } from 'antd/lib/typography/Title';
import { HTMLAttributes } from 'react';
import styled, { FlattenSimpleInterpolation } from 'styled-components';

import { IStyledClass } from './types';

const styledClass = (props: IStyledClass): FlattenSimpleInterpolation | null =>
	props.styledclass || null;

type TStyledCol = AntD.ColProps & IStyledClass;
const StyledCol = styled(AntD.Col)<TStyledCol>`
	${styledClass}
`;

type TStyledRow = AntD.RowProps & IStyledClass;
const StyledRow = styled(AntD.Row)<TStyledRow>`
	${styledClass}
`;

type TStyledDivider = AntD.DividerProps & IStyledClass;
const StyledDivider = styled(AntD.Divider)<TStyledDivider>`
	${styledClass}
`;

type TStyledSpace = AntD.SpaceProps & IStyledClass;
const StyledSpace = styled(AntD.Space)<TStyledSpace>`
	${styledClass}
`;

type TStyledTabs = AntD.TabsProps & IStyledClass;
const StyledTabs = styled(AntD.Divider)<TStyledTabs>`
	${styledClass}
`;

type TStyledButton = AntD.ButtonProps & IStyledClass;
const StyledButton = styled(AntD.Button)<TStyledButton>`
	${styledClass}
`;

const { Text } = AntD.Typography;
type TStyledTypographyText = TextProps & IStyledClass;
const StyledTypographyText = styled(Text)<TStyledTypographyText>`
	${styledClass}
`;

const { Title } = AntD.Typography;
type TStyledTypographyTitle = TitleProps & IStyledClass;
const StyledTypographyTitle = styled(Title)<TStyledTypographyTitle>`
	${styledClass}
`;

type TStyledDiv = HTMLAttributes<HTMLDivElement> & IStyledClass;
const StyledDiv = styled.div<TStyledDiv>`
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
