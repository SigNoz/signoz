import { red } from '@ant-design/colors';
import { Card, Tooltip } from 'antd';
import styled from 'styled-components';

export const NotFoundContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 55vh;
`;

export const FailedMessageContainer = styled(Tooltip)`
	position: absolute;
	color: ${red};
	top: 4rem;
	left: 10px;
`;

export const ChartContainer = styled(Card)`
	border-radius: 4px;
	&&& {
		position: relative;
	}

	.plot-tag {
		margin-left: 6px;
		display: inline-flex;
		padding: 0px 4px 0px 6px;
		align-items: center;
		gap: 6px;
		border-radius: 4px;
		background: var(--bg-slate-400);
		backdrop-filter: blur(6px);
		width: fit-content;
	}

	.ant-card-body {
		padding: 1.5rem 0;
		height: 57vh;
		/* padding-bottom: 2rem; */
	}
`;
