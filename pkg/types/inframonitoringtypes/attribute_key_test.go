package inframonitoringtypes

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAttributeKeyMembersCoverBareConsts(t *testing.T) {
	values := make(map[string]bool, len(AttributeKeyMembers))
	for _, member := range AttributeKeyMembers {
		values[member.Key.StringValue()] = true
	}

	bareConsts := []string{
		HostNameAttrKey,
		ClusterNameAttrKey,
		NamespaceNameAttrKey,
		NodeNameAttrKey,
		PodNameAttrKey,
		ContainerNameAttrKey,
		DeploymentNameAttrKey,
		StatefulSetNameAttrKey,
		DaemonSetNameAttrKey,
		JobNameAttrKey,
		PersistentVolumeClaimNameAttrKey,
	}

	for _, bareConst := range bareConsts {
		require.Truef(t, values[bareConst], "bare AttrKey const %q has no matching AttributeKey enum member", bareConst)
	}
}

func TestAttributeKeyMembersAndEnumInSync(t *testing.T) {
	enum := AttributeKey{}.Enum()
	require.Len(t, enum, len(AttributeKeyMembers))

	names := make(map[string]bool, len(AttributeKeyMembers))
	for i, member := range AttributeKeyMembers {
		require.NotEmpty(t, member.Name)
		require.NotEmpty(t, member.Key.StringValue())
		require.Falsef(t, names[member.Name], "duplicate member name %q", member.Name)
		names[member.Name] = true
		require.Equal(t, member.Key, enum[i])
	}
}
