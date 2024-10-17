import getOnboardingStatus, {
	OnboardingStatusResponse,
} from 'api/messagingQueues/onboarding/getOnboardingStatus';
import { useCallback, useEffect, useState } from 'react';

interface UseOnboardingStatusProps {
	start: number;
	end: number;
	pollingInterval?: number;
	retryCount?: number;
}

interface UseOnboardingStatusReturn {
	data: OnboardingStatusResponse['data'] | null;
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

const useOnboardingStatus = ({
	start,
	end,
	pollingInterval,
	retryCount,
}: UseOnboardingStatusProps): UseOnboardingStatusReturn => {
	const [data, setData] = useState<OnboardingStatusResponse['data'] | null>(
		null,
	);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [retryAttempts, setRetryAttempts] = useState<number>(0);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await getOnboardingStatus(start, end);
			if (response.statusCode === 200) {
				setData(response.payload.data);
			}
			setLoading(false);
			setRetryAttempts(0); // Reset retry attempts on success
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError('An unknown error occurred');
			}
			setLoading(false);
			if (retryCount && retryAttempts < retryCount) {
				setRetryAttempts(retryAttempts + 1);
			}
		}
	}, [start, end, retryAttempts, retryCount]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		let pollingTimer: NodeJS.Timer | undefined;
		console.log(pollingInterval);
		if (pollingInterval && loading) {
			pollingTimer = setInterval(() => {
				fetchData();
			}, pollingInterval);
		} else if (!loading && pollingTimer) {
			clearInterval(pollingTimer);
		}

		return (): void => {
			if (pollingTimer) {
				clearInterval(pollingTimer);
			}
		};
	}, [loading, pollingInterval, fetchData]);

	return { data, loading, error, refetch: fetchData };
};

export default useOnboardingStatus;
