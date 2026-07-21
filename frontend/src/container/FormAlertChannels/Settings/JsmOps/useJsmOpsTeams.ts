import { useQuery } from 'react-query';
import getJsmOpsTeams from 'api/channels/getJsmOpsTeams';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { JsmOpsTeam } from 'types/api/channels/jsmOps';

interface UseJsmOpsTeamsParams {
	connectionId?: string;
	channelId?: string;
	enabled: boolean;
}

interface UseJsmOpsTeamsResult {
	teams: JsmOpsTeam[];
	isLoading: boolean;
	isError: boolean;
}

export function useJsmOpsTeams({
	connectionId,
	channelId,
	enabled,
}: UseJsmOpsTeamsParams): UseJsmOpsTeamsResult {
	const query = useQuery<SuccessResponseV2<JsmOpsTeam[]>, APIError>(
		['jsmOpsTeams', connectionId, channelId],
		() => getJsmOpsTeams({ connectionId, channelId }),
		{ enabled: enabled && Boolean(connectionId || channelId) },
	);

	return {
		teams: query.data?.data || [],
		isLoading: query.isFetching,
		isError: query.isError,
	};
}
