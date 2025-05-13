import './StepsFooter.styles.scss';

import { Button, Skeleton } from 'antd';
import { Cone, Play } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';

interface StepsFooterProps {
	stepsCount: number;
}

function ValidTracesCount(): JSX.Element {
	const {
		hasAllEmptyStepFields,
		isValidateStepsLoading,
		hasIncompleteStepFields,
		validTracesCount,
	} = useFunnelContext();
	if (isValidateStepsLoading) {
		return <Skeleton.Button size="small" />;
	}

	if (hasAllEmptyStepFields) {
		return (
			<span className="steps-footer__valid-traces">No service / span names</span>
		);
	}

	if (hasIncompleteStepFields) {
		return (
			<span className="steps-footer__valid-traces">
				Missing service / span names
			</span>
		);
	}

	if (validTracesCount === 0) {
		return (
			<span className="steps-footer__valid-traces steps-footer__valid-traces--none">
				No valid traces found
			</span>
		);
	}

	return <span className="steps-footer__valid-traces">Valid traces found</span>;
}

function StepsFooter({ stepsCount }: StepsFooterProps): JSX.Element {
	const { validTracesCount, handleRunFunnel } = useFunnelContext();

	return (
		<div className="steps-footer">
			<div className="steps-footer__left">
				<Cone className="funnel-icon" size={14} />
				<span>{stepsCount} steps</span>
				<span>·</span>
				<ValidTracesCount />
			</div>
			<div className="steps-footer__right">
				<Button
					disabled={validTracesCount === 0}
					onClick={handleRunFunnel}
					type="primary"
					className="steps-footer__button steps-footer__button--run"
					icon={<Play size={16} />}
				>
					Run funnel
				</Button>
			</div>
		</div>
	);
}

export default StepsFooter;
