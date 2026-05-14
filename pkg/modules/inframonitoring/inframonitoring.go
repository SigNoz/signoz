package inframonitoring

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler interface {
	ListHosts(http.ResponseWriter, *http.Request)
	ListPods(http.ResponseWriter, *http.Request)
	ListNodes(http.ResponseWriter, *http.Request)
	ListNamespaces(http.ResponseWriter, *http.Request)
	ListClusters(http.ResponseWriter, *http.Request)
	ListVolumes(http.ResponseWriter, *http.Request)
	ListDeployments(http.ResponseWriter, *http.Request)
	ListStatefulSets(http.ResponseWriter, *http.Request)
	ListJobs(http.ResponseWriter, *http.Request)
}

type Module interface {
	ListHosts(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableHosts) (*inframonitoringtypes.Hosts, error)
	ListPods(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostablePods) (*inframonitoringtypes.Pods, error)
	ListNodes(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableNodes) (*inframonitoringtypes.Nodes, error)
	ListNamespaces(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableNamespaces) (*inframonitoringtypes.Namespaces, error)
	ListClusters(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableClusters) (*inframonitoringtypes.Clusters, error)
	ListVolumes(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableVolumes) (*inframonitoringtypes.Volumes, error)
	ListDeployments(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableDeployments) (*inframonitoringtypes.Deployments, error)
	ListStatefulSets(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableStatefulSets) (*inframonitoringtypes.StatefulSets, error)
	ListJobs(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableJobs) (*inframonitoringtypes.Jobs, error)
}
