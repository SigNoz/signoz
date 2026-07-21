package inframonitoringtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type AttributeKey struct {
	valuer.String
}

var (
	AttributeKeyHostName                     = AttributeKey{valuer.NewString(HostNameAttrKey)}
	AttributeKeyK8SClusterName               = AttributeKey{valuer.NewString(ClusterNameAttrKey)}
	AttributeKeyK8SNamespaceName             = AttributeKey{valuer.NewString(NamespaceNameAttrKey)}
	AttributeKeyK8SNodeName                  = AttributeKey{valuer.NewString(NodeNameAttrKey)}
	AttributeKeyK8SPodName                   = AttributeKey{valuer.NewString(PodNameAttrKey)}
	AttributeKeyK8SContainerName             = AttributeKey{valuer.NewString(ContainerNameAttrKey)}
	AttributeKeyK8SDeploymentName            = AttributeKey{valuer.NewString(DeploymentNameAttrKey)}
	AttributeKeyK8SStatefulSetName           = AttributeKey{valuer.NewString(StatefulSetNameAttrKey)}
	AttributeKeyK8SDaemonSetName             = AttributeKey{valuer.NewString(DaemonSetNameAttrKey)}
	AttributeKeyK8SJobName                   = AttributeKey{valuer.NewString(JobNameAttrKey)}
	AttributeKeyK8SPersistentVolumeClaimName = AttributeKey{valuer.NewString(PersistentVolumeClaimNameAttrKey)}
)

type AttributeKeyMember struct {
	Name string
	Key  AttributeKey
}

var AttributeKeyMembers = []AttributeKeyMember{
	{"HOST_NAME", AttributeKeyHostName},
	{"K8S_CLUSTER_NAME", AttributeKeyK8SClusterName},
	{"K8S_NAMESPACE_NAME", AttributeKeyK8SNamespaceName},
	{"K8S_NODE_NAME", AttributeKeyK8SNodeName},
	{"K8S_POD_NAME", AttributeKeyK8SPodName},
	{"K8S_CONTAINER_NAME", AttributeKeyK8SContainerName},
	{"K8S_DEPLOYMENT_NAME", AttributeKeyK8SDeploymentName},
	{"K8S_STATEFULSET_NAME", AttributeKeyK8SStatefulSetName},
	{"K8S_DAEMONSET_NAME", AttributeKeyK8SDaemonSetName},
	{"K8S_JOB_NAME", AttributeKeyK8SJobName},
	{"K8S_PERSISTENT_VOLUME_CLAIM_NAME", AttributeKeyK8SPersistentVolumeClaimName},
}

func (AttributeKey) Enum() []any {
	members := make([]any, len(AttributeKeyMembers))
	for i := range AttributeKeyMembers {
		members[i] = AttributeKeyMembers[i].Key
	}

	return members
}
