import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface K8sEntityStatusResponse {
	didSendPodMetrics: boolean;
	didSendNodeMetrics: boolean;
	didSendClusterMetrics: boolean;
	isSendingOptionalPodMetrics: boolean;
	isSendingRequiredMetadata: Array<{
		clusterName: string;
		nodeName: string;
		namespaceName: string;
		podName: string;
		hasClusterName: boolean;
		hasNodeName: boolean;
		hasNamespaceName: boolean;
		hasDeploymentName: boolean;
		hasStatefulsetName: boolean;
		hasDaemonsetName: boolean;
		hasCronjobName: boolean;
		hasJobName: boolean;
	}>;
}

export const getK8sEntityStatus = async (
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<K8sEntityStatusResponse> | ErrorResponse> => {
	try {
		const response = await axios.post('/infra_onboarding/k8s/status', {
			signal,
			headers,
		});
		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
