package model

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestFindOrCreateAgentRejectsInvalidAgentID(t *testing.T) {
	tests := []struct {
		name    string
		agentID string
	}{
		{
			name: "missing agent ID",
		},
		{
			name:    "malformed agent ID",
			agentID: "not-a-uuid",
		},
		{
			name:    "zero agent ID",
			agentID: "00000000-0000-0000-0000-000000000000",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			agents := &Agents{}

			agent, created, err := agents.FindOrCreateAgent(test.agentID, nil, valuer.UUID{})

			require.ErrorContains(t, err, "invalid agentID")
			require.Nil(t, agent)
			require.False(t, created)
		})
	}
}
