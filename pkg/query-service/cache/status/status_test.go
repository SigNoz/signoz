package status

import (
	"testing"
)

func TestRetrieveStatusString(t *testing.T) {
	tests := []struct {
		status RetrieveStatus
		want   string
	}{
		{
			status: RetrieveStatusHit,
			want:   "hit",
		},
		{
			status: RetrieveStatusPartialHit,
			want:   "partial hit",
		},
		{
			status: RetrieveStatusRangeMiss,
			want:   "range miss",
		},
		{
			status: RetrieveStatusKeyMiss,
			want:   "key miss",
		},
		{
			status: RetrieveStatusRevalidated,
			want:   "revalidated",
		},
		{
			status: RetrieveStatusError,
			want:   "error",
		},
	}

	for _, tt := range tests {
		if got := tt.status.String(); got != tt.want {
			t.Errorf("RetrieveStatus.String() = %v, want %v", got, tt.want)
		}
	}
}
