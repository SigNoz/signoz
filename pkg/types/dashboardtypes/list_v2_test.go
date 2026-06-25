package dashboardtypes

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListDashboardsV2ParamsValidate(t *testing.T) {
	t.Run("fills defaults when sort, order and limit are unset", func(t *testing.T) {
		p := &ListDashboardsV2Params{}
		require.NoError(t, p.Validate())
		assert.Equal(t, ListSortUpdatedAt, p.Sort)
		assert.Equal(t, ListOrderDesc, p.Order)
		assert.Equal(t, DefaultListLimit, p.Limit)
	})

	t.Run("clamps limit to MaxListLimit", func(t *testing.T) {
		p := &ListDashboardsV2Params{Limit: MaxListLimit + 50}
		require.NoError(t, p.Validate())
		assert.Equal(t, MaxListLimit, p.Limit)
	})

	t.Run("query at the cap is accepted", func(t *testing.T) {
		p := &ListDashboardsV2Params{ListFilter: ListFilter{Query: strings.Repeat("x", MaxListQueryLen)}}
		assert.NoError(t, p.Validate())
	})

	t.Run("query over the cap is rejected", func(t *testing.T) {
		p := &ListDashboardsV2Params{ListFilter: ListFilter{Query: strings.Repeat("x", MaxListQueryLen+1)}}
		assert.Error(t, p.Validate())
	})
}
