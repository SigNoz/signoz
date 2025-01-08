package cloudintegrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRepo(t *testing.T) {
	require := require.New(t)

	// record Ids should be scoped by cloud provider.

	// querying records should be scoped by cloud provider.

	require.Equal(1, 2)
}
