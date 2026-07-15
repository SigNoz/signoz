package anomaly

import (
	"os"
	"strings"
	"testing"
)

func TestTransferAIOpsTunedModelsToNABAWS(t *testing.T) {
	if _, err := loadAIOPSDevelopmentCorpusFromEnv(); err != nil {
		t.Skip(err.Error())
	}

	nabRoot := getenvTrimmed("NAB_ROOT")
	if nabRoot == "" {
		t.Skip("NAB_ROOT is not configured")
	}

	frozen, err := requireFrozenAIOPSCandidates()
	if err != nil {
		t.Skip(err.Error())
	}

	t.Logf("selected_before_nab=%t", frozen.SelectedBeforeNAB)
	t.Logf("candidate_changed_after_nab=%t", frozen.CandidateChangedAfter)
	t.Logf("nab_used_for_tuning=%t", frozen.NABUsedForTuning)
	t.Log("NAB transfer evaluation is blocked until frozen AIOps champions are committed.")
	t.Log("prior_nab_tuned_reference_only contaminated_by_prior_nab_tuning=true eligible_for_transfer_claim=false")
}

func getenvTrimmed(name string) string {
	return strings.TrimSpace(os.Getenv(name))
}
