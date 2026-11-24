import type { HTMLAttributes } from 'react';
import type { ButtonProps } from 'antd';
import { Button } from 'antd';
import Space from 'periscope/components/Space/Space';
import type { SpaceProps } from 'periscope/components/Space/types';
import Col from 'periscope/components/Col/Col';
import type { ColProps } from 'periscope/components/Col/types';
import Row from 'periscope/components/Row/Row';
import type { RowProps } from 'periscope/components/Row/types';
import type { FlattenSimpleInterpolation } from 'styled-components';
import styled from 'styled-components';

import type { IStyledClass } from './types';

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
