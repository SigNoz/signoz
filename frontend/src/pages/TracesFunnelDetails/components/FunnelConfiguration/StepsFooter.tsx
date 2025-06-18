import './StepsFooter.styles.scss';

import { Button, Skeleton } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Check, Cone } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useIsMutating } from 'react-query';

interface StepsFooterProps {
	stepsCount: number;
	isSaving: boolean;
}

function ValidTracesCount(): JSX.Element {
	const {
		hasAllEmptyStepFields,
		isValidateStepsLoading,
		hasIncompleteStepFields,
		validTracesCount,
		funnelId,
	} = useFunnelContext();

	const isFunnelUpdateMutating = useIsMutating([
		REACT_QUERY_KEY.UPDATE_FUNNEL_STEPS,
		funnelId,
	]);

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

	if (isValidateStepsLoading || isFunnelUpdateMutating) {
		return <Skeleton.Button size="small" />;
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

function StepsFooter({ stepsCount, isSaving }: StepsFooterProps): JSX.Element {
	const {
		hasIncompleteStepFields,
		handleSaveFunnel,
		hasUnsavedChanges,
	} = useFunnelContext();

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
					disabled={hasIncompleteStepFields || !hasUnsavedChanges}
					onClick={handleSaveFunnel}
					type="primary"
					className="steps-footer__button steps-footer__button--run"
					icon={<Check size={14} />}
					loading={isSaving}
				>
					Save funnel
				</Button>
			</div>
		</div>
	);
}

export default StepsFooter;
