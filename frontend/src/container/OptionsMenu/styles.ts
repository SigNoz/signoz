import { Card } from 'antd';
import Space from 'periscope/components/Space/Space';
import styled from 'styled-components';

export const OptionsContainer = styled(Card)`
	.ant-card-body {
		display: flex;
		padding: 0.25rem 0.938rem;
		cursor: pointer;
	}
`;

export const OptionsContentWrapper = styled(Space)`
	min-width: 11rem;
	padding: 0.25rem 0.5rem;
`;
