package app

import (
	"encoding/json"
	"net/http"

	"go.signoz.io/signoz/pkg/query-service/model"
)

func (aH *APIHandler) getHostAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// get attribute keys
	keys, err := aH.hostsRepo.GetHostAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// write response
	aH.Respond(w, keys)
}

func (aH *APIHandler) getHostAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseFilterAttributeValueRequest(r)

	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// get attribute values
	values, err := aH.hostsRepo.GetHostAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// write response
	aH.Respond(w, values)
}

func (aH *APIHandler) getHostList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.HostListRequest{}

	// parse request
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// get host list
	hostList, err := aH.hostsRepo.GetHostList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// write response
	aH.Respond(w, hostList)
}

func (aH *APIHandler) getProcessAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.processesRepo.GetProcessAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getProcessAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.processesRepo.GetProcessAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getProcessList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.ProcessListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	hostList, err := aH.processesRepo.GetProcessList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, hostList)
}

func (aH *APIHandler) getPodAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.podsRepo.GetPodAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getPodAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.podsRepo.GetPodAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getPodList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.PodListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	podList, err := aH.podsRepo.GetPodList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, podList)
}

func (aH *APIHandler) getNodeAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.nodesRepo.GetNodeAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getNodeAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.nodesRepo.GetNodeAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getNodeList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.NodeListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	nodeList, err := aH.nodesRepo.GetNodeList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, nodeList)
}

func (aH *APIHandler) getNamespaceAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.namespacesRepo.GetNamespaceAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getNamespaceAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.namespacesRepo.GetNamespaceAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getNamespaceList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.NamespaceListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	namespaceList, err := aH.namespacesRepo.GetNamespaceList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, namespaceList)
}

func (aH *APIHandler) getClusterAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.clustersRepo.GetClusterAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getClusterAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.clustersRepo.GetClusterAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getClusterList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.ClusterListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	clusterList, err := aH.clustersRepo.GetClusterList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, clusterList)
}

func (aH *APIHandler) getDeploymentAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.deploymentsRepo.GetDeploymentAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getDeploymentAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.deploymentsRepo.GetDeploymentAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getDeploymentList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.DeploymentListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	deploymentList, err := aH.deploymentsRepo.GetDeploymentList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, deploymentList)
}

func (aH *APIHandler) getDaemonSetAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.daemonsetsRepo.GetDaemonSetAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getDaemonSetAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.daemonsetsRepo.GetDaemonSetAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getDaemonSetList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.DaemonSetListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	daemonSetList, err := aH.daemonsetsRepo.GetDaemonSetList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, daemonSetList)
}

func (aH *APIHandler) getStatefulSetAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.statefulsetsRepo.GetStatefulSetAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getStatefulSetAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.statefulsetsRepo.GetStatefulSetAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getStatefulSetList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.StatefulSetListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	statefulSetList, err := aH.statefulsetsRepo.GetStatefulSetList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, statefulSetList)
}

func (aH *APIHandler) getJobAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.jobsRepo.GetJobAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, keys)
}

func (aH *APIHandler) getJobAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.jobsRepo.GetJobAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}
	aH.Respond(w, values)
}

func (aH *APIHandler) getJobList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.JobListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	jobList, err := aH.jobsRepo.GetJobList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, jobList)
}

func (aH *APIHandler) getPvcList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req := model.VolumeListRequest{}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	pvcList, err := aH.pvcsRepo.GetPvcList(ctx, req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, pvcList)
}

func (aH *APIHandler) getPvcAttributeKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeKeyRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	keys, err := aH.pvcsRepo.GetPvcAttributeKeys(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, keys)
}

func (aH *APIHandler) getPvcAttributeValues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	req, err := parseFilterAttributeValueRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	values, err := aH.pvcsRepo.GetPvcAttributeValues(ctx, *req)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	aH.Respond(w, values)
}

func (aH *APIHandler) getK8sInfraOnboardingStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	status := model.OnboardingStatus{}

	didSendPodMetrics, err := aH.podsRepo.DidSendPodMetrics(ctx)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	if !didSendPodMetrics {
		aH.Respond(w, status)
		return
	}

	didSendClusterMetrics, err := aH.podsRepo.DidSendClusterMetrics(ctx)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	didSendNodeMetrics, err := aH.nodesRepo.DidSendNodeMetrics(ctx)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	didSendOptionalPodMetrics, err := aH.podsRepo.IsSendingOptionalPodMetrics(ctx)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	requiredMetadata, err := aH.podsRepo.SendingRequiredMetadata(ctx)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	status.DidSendPodMetrics = didSendPodMetrics
	status.DidSendClusterMetrics = didSendClusterMetrics
	status.DidSendNodeMetrics = didSendNodeMetrics
	status.IsSendingOptionalPodMetrics = didSendOptionalPodMetrics
	status.IsSendingRequiredMetadata = requiredMetadata

	aH.Respond(w, status)
}
