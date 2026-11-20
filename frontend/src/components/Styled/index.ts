import { HTMLAttributes } from 'react';
import { Button, ButtonProps } from 'antd';
import Space from 'periscope/components/Space/Space';
import type { SpaceProps } from 'periscope/components/Space/types';
import Col from 'periscope/components/Col/Col';
import type { ColProps } from 'periscope/components/Col/types';
import Row from 'periscope/components/Row/Row';
import type { RowProps } from 'periscope/components/Row/types';
import {
	Typography,
	TypographyTextProps,
	TypographyTitleProps,
} from '@signozhq/ui/typography';
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

const { Text } = Typography;
type TStyledTypographyText = TypographyTextProps & IStyledClass;
const StyledTypographyText = styled(Text)<TStyledTypographyText>`
	${styledClass}
`;

const { Title } = Typography;
type TStyledTypographyTitle = TypographyTitleProps & IStyledClass;
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
	StyledRow,
	StyledSpace,
	StyledTypography,
};
