import axios from 'api';
import { AxiosResponse } from 'axios';
import { ViewProps } from 'types/api/saveViews/types';

/**
 * Fetches a single saved view by ID (`GET /api/v1/explorer/views/{viewId}`).
 *
 * Hand-maintained alongside the other `api/saveView/*` clients — explorer views
 * are not in `docs/api/openapi.yml`, so Orval does not generate a hook here
 * (unlike e.g. `useGetChannelByID` under `api/generated/services/channels`).
 *
 * Used by the AI assistant "Open view" action to load `compositeQuery` and
 * navigate to the correct explorer without listing every view per source page.
 * See `container/AIAssistant/components/ActionsSection/utils/openSavedView.ts`.
 */
export interface GetViewByIdProps {
	status: string;
	data: ViewProps;
}

export const getViewById = (
	viewKey: string,
): Promise<AxiosResponse<GetViewByIdProps>> =>
	axios.get(`/explorer/views/${viewKey}`);
