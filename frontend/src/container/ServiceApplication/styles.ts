import { Typography } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const Container = styled.div`
	margin-top: 2rem;
`;

export const Name = styled(Typography)`
	&&& {
		font-weight: 600;
		color: ${themeColors.lightBlue};
		cursor: pointer;
	}
`;
