package preferencetypes

import (
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	NameOrgOnboarding                           = Name{valuer.NewString("org_onboarding")}
	NameWelcomeChecklistDoLater                 = Name{valuer.NewString("welcome_checklist_do_later")}
	NameWelcomeChecklistSendLogsSkipped         = Name{valuer.NewString("welcome_checklist_send_logs_skipped")}
	NameWelcomeChecklistSendTracesSkipped       = Name{valuer.NewString("welcome_checklist_send_traces_skipped")}
	NameWelcomeChecklistSendInfraMetricsSkipped = Name{valuer.NewString("welcome_checklist_send_infra_metrics_skipped")}
	NameWelcomeChecklistSetupDashboardsSkipped  = Name{valuer.NewString("welcome_checklist_setup_dashboards_skipped")}
	NameWelcomeChecklistSetupAlertsSkipped      = Name{valuer.NewString("welcome_checklist_setup_alerts_skipped")}
	NameWelcomeChecklistSetupSavedViewSkipped   = Name{valuer.NewString("welcome_checklist_setup_saved_view_skipped")}
	NameSidenavPinned                           = Name{valuer.NewString("sidenav_pinned")}
	NameNavShortcuts                            = Name{valuer.NewString("nav_shortcuts")}
	NameLastSeenChangelogVersion                = Name{valuer.NewString("last_seen_changelog_version")}
	NameSpanDetailsPinnedAttributes             = Name{valuer.NewString("span_details_pinned_attributes")}
	NameSpanPercentileResourceAttributes        = Name{valuer.NewString("span_percentile_resource_attributes")}
)

type Name struct{ valuer.String }

func NewName(name string) (Name, error) {
	ok := slices.Contains(
		[]string{
			NameOrgOnboarding.StringValue(),
			NameWelcomeChecklistDoLater.StringValue(),
			NameWelcomeChecklistSendLogsSkipped.StringValue(),
			NameWelcomeChecklistSendTracesSkipped.StringValue(),
			NameWelcomeChecklistSendInfraMetricsSkipped.StringValue(),
			NameWelcomeChecklistSetupDashboardsSkipped.StringValue(),
			NameWelcomeChecklistSetupAlertsSkipped.StringValue(),
			NameWelcomeChecklistSetupSavedViewSkipped.StringValue(),
			NameSidenavPinned.StringValue(),
			NameNavShortcuts.StringValue(),
			NameLastSeenChangelogVersion.StringValue(),
			NameSpanDetailsPinnedAttributes.StringValue(),
			NameSpanPercentileResourceAttributes.StringValue(),
		},
		name,
	)
	if !ok {
		return Name{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid name: %s", name)
	}

	return Name{valuer.NewString(name)}, nil
}
