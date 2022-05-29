import { Typography } from 'antd';
import styled from 'styled-components';

export const CheckBoxContainer = styled.div`
	display: flex;
	justify-content: space-between;
	margin-left: 1rem;
	margin-right: 1rem;

	margin-top: 0.5rem;
	margin-bottom: 0.5rem;
`;

export const ParaGraph = styled(Typography.Paragraph)`
	&&& {
		margin: 0;
		max-width: 8rem;
	}
`;
