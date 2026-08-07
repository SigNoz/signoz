package savedviewtypes

import (
	"crypto/rand"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"k8s.io/apimachinery/pkg/util/validation"
)

var (
	ErrCodeSavedViewInvalidInput = errors.MustNewCode("saved_view_invalid_input")
	ErrCodeSavedViewNotFound     = errors.MustNewCode("saved_view_not_found")
)

// savedViewNameSuffixLen mirrors dashboardtypes' generated-name logic.
const savedViewNameSuffixLen = 8

var (
	SourceTraces  = Source{valuer.NewString("traces")}
	SourceLogs    = Source{valuer.NewString("logs")}
	SourceMetrics = Source{valuer.NewString("metrics")}
	SourceMeter   = Source{valuer.NewString("meter")}
)

type SavedView struct {
	bun.BaseModel `bun:"table:saved_view"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID  string        `json:"-" bun:"org_id,notnull"`
	Name   string        `json:"name" bun:"name,type:text,notnull"`
	Source Source        `json:"source" bun:"source,type:text,notnull"`
	Data   SavedViewData `json:"data" bun:"data,type:text,notnull"`
}

// Update applies an UpdatableSavedView onto an existing view. Name is immutable.
func (v *SavedView) Update(updatable UpdatableSavedView, updatedBy string) {
	v.Source = updatable.Source
	v.Data = updatable.Data
	v.UpdatedBy = updatedBy
	v.UpdatedAt = time.Now()
}

type PostableSavedView struct {
	Name         string        `json:"name"`
	GenerateName bool          `json:"generateName"`
	Source       Source        `json:"source" required:"true"`
	Data         SavedViewData `json:"data" required:"true"`
}

type UpdatableSavedView struct {
	Source Source        `json:"source" required:"true"`
	Data   SavedViewData `json:"data" required:"true"`
}

type ListSavedViewsParams struct {
	Source Source `query:"source"`
	Name   string `query:"name"`
}

type Source struct {
	valuer.String
}

func (Source) Enum() []any {
	return []any{
		SourceTraces,
		SourceLogs,
		SourceMetrics,
		SourceMeter,
	}
}

func (s Source) Validate() error {
	switch s {
	case SourceTraces, SourceLogs, SourceMetrics, SourceMeter:
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "invalid source: %s", s.StringValue())
	}
}

func (postable PostableSavedView) ToSavedView(orgID string, createdBy string) *SavedView {
	now := time.Now()

	name := postable.Name
	if postable.GenerateName {
		name = generateSavedViewName(postable.Data.Spec.DisplayName)
	}

	return &SavedView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:         orgID,
		Name:          name,
		Source:        postable.Source,
		Data:          postable.Data,
	}
}

func (p *PostableSavedView) Validate() error {
	if err := p.validateName(); err != nil {
		return err
	}
	if err := p.Source.Validate(); err != nil {
		return err
	}

	return p.Data.Validate()
}

func (p *PostableSavedView) validateName() error {
	if !p.GenerateName {
		return validateSavedViewName(p.Name)
	}
	if p.Name != "" {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "name must be empty when generateName is true, got %q", p.Name)
	}
	return nil
}

func (u *UpdatableSavedView) Validate() error {
	if err := u.Source.Validate(); err != nil {
		return err
	}

	return u.Data.Validate()
}

func (p *ListSavedViewsParams) Validate() error {
	if p.Source.IsZero() {
		return nil
	}

	return p.Source.Validate()
}

func NewStatsFromSavedViews(savedViews []*SavedView) map[string]any {
	stats := make(map[string]any)
	for _, savedView := range savedViews {
		key := "savedview.source." + strings.ToLower(savedView.Source.StringValue()) + ".count"
		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}
	}

	stats["savedview.count"] = int64(len(savedViews))
	return stats
}

// Matches https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names.
func validateSavedViewName(name string) error {
	if name == "" {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "name is required")
	}
	if errs := validation.IsDNS1123Label(name); len(errs) > 0 {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "name %q is invalid: %s", name, strings.Join(errs, "; "))
	}
	return nil
}

// generateSavedViewName is a copy of dashboardtypes.generateDashboardName: slugify
// the display name and append a random suffix for practical collision avoidance
// (the DB unique index on (org_id, name) is what actually guarantees uniqueness).
func generateSavedViewName(displayName string) string {
	const dns1123LabelMaxLen = 63
	suffixAlphabet := []byte("abcdefghijklmnopqrstuvwxyz0123456789")

	var b strings.Builder
	b.Grow(len(displayName))
	prevHyphen := false
	for _, r := range strings.ToLower(displayName) {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevHyphen = false
		case b.Len() > 0 && !prevHyphen:
			b.WriteByte('-')
			prevHyphen = true
		}
	}
	prefix := strings.TrimRight(b.String(), "-")

	suffix := make([]byte, savedViewNameSuffixLen)
	if _, err := rand.Read(suffix); err != nil {
		panic(errors.WrapInternalf(err, errors.CodeInternal, "read random for saved view name suffix"))
	}
	for i := range suffix {
		suffix[i] = suffixAlphabet[int(suffix[i])%len(suffixAlphabet)]
	}

	maxPrefix := dns1123LabelMaxLen - 1 - savedViewNameSuffixLen
	if len(prefix) > maxPrefix {
		prefix = strings.TrimRight(prefix[:maxPrefix], "-")
	}
	if prefix == "" {
		return string(suffix)
	}
	return prefix + "-" + string(suffix)
}
