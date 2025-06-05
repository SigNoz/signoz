import './StepsFooter.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Button, Skeleton, Spin } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { Cone, Play, RefreshCcw } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useMemo } from 'react';
import { useIsFetching, useIsMutating } from 'react-query';

const useFunnelResultsLoading = (): boolean => {
	const { funnelId } = useFunnelContext();

	const isFetchingFunnelOverview = useIsFetching({
		queryKey: [REACT_QUERY_KEY.GET_FUNNEL_OVERVIEW, funnelId],
	});

	const isFetchingStepsGraphData = useIsFetching({
		queryKey: [REACT_QUERY_KEY.GET_FUNNEL_STEPS_GRAPH_DATA, funnelId],
	});

	const isFetchingErrorTraces = useIsFetching({
		queryKey: [REACT_QUERY_KEY.GET_FUNNEL_ERROR_TRACES, funnelId],
	});

	const isFetchingSlowTraces = useIsFetching({
		queryKey: [REACT_QUERY_KEY.GET_FUNNEL_SLOW_TRACES, funnelId],
	});

	return useMemo(() => {
		if (!funnelId) {
			return false;
		}
		return (
			!!isFetchingFunnelOverview ||
			!!isFetchingStepsGraphData ||
			!!isFetchingErrorTraces ||
			!!isFetchingSlowTraces
		);
	}, [
		funnelId,
		isFetchingFunnelOverview,
		isFetchingStepsGraphData,
		isFetchingErrorTraces,
		isFetchingSlowTraces,
	]);
};

interface StepsFooterProps {
	stepsCount: number;
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

function StepsFooter({ stepsCount }: StepsFooterProps): JSX.Element {
	const {
		validTracesCount,
		handleRunFunnel,
		hasFunnelBeenExecuted,
		funnelId,
	} = useFunnelContext();

	const isFunnelResultsLoading = useFunnelResultsLoading();

	const isFunnelUpdateMutating = useIsMutating([
		REACT_QUERY_KEY.UPDATE_FUNNEL_STEPS,
		funnelId,
	]);

	return (
		<div className="steps-footer">
			<div className="steps-footer__left">
				<Cone className="funnel-icon" size={14} />
				<span>{stepsCount} steps</span>
				<span>·</span>
				<ValidTracesCount />
			</div>
			<div className="steps-footer__right">
				{!!isFunnelUpdateMutating && (
					<div className="steps-footer__button steps-footer__button--updating">
						<Spin
							indicator={<LoadingOutlined style={{ color: 'grey' }} />}
							size="small"
						/>
						Updating
					</div>
				)}

				{!hasFunnelBeenExecuted ? (
					<Button
						disabled={validTracesCount === 0}
						onClick={handleRunFunnel}
						type="primary"
						className="steps-footer__button steps-footer__button--run"
						icon={<Play size={16} />}
					>
						Run funnel
					</Button>
				) : (
					<Button
						type="text"
						className="steps-footer__button steps-footer__button--sync"
						icon={<RefreshCcw size={16} />}
						onClick={handleRunFunnel}
						loading={isFunnelResultsLoading}
						disabled={validTracesCount === 0}
					>
						Refresh
					</Button>
				)}
			</div>
		</div>
	);
}

export default StepsFooter;
