package tagtypes

import (
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const (
	MAX_LEN_TAG_KEY   = 32
	MAX_LEN_TAG_VALUE = 32
)

var (
	tagKeyRegex   = regexp.MustCompile(`^[a-zA-Z$_@{#][a-zA-Z0-9$_@#{}:/-]*$`)
	tagValueRegex = regexp.MustCompile(`^[a-zA-Z0-9$_@#{}:.+=/-]*$`)

	ErrCodeTagInvalidKey   = errors.MustNewCode("tag_invalid_key")
	ErrCodeTagInvalidValue = errors.MustNewCode("tag_invalid_value")
	ErrCodeTagNotFound     = errors.MustNewCode("tag_not_found")
)

type Tag struct {
	bun.BaseModel `bun:"table:tag,alias:tag"`

	types.Identifiable
	types.TimeAuditable
	Key   string         `json:"key" required:"true" bun:"key,type:text,notnull"`
	Value string         `json:"value" required:"true" bun:"value,type:text,notnull"`
	OrgID valuer.UUID    `json:"orgId" required:"true" bun:"org_id,type:text,notnull"`
	Kind  coretypes.Kind `json:"kind" required:"true" bun:"kind,type:text,notnull"`
}

type PostableTag struct {
	Key   string `json:"key" required:"true"`
	Value string `json:"value" required:"true"`
}

type GettableTag = PostableTag

func NewGettableTagFromTag(tag *Tag) *GettableTag {
	return &GettableTag{Key: tag.Key, Value: tag.Value}
}

func NewGettableTagsFromTags(tags []*Tag) []*GettableTag {
	out := make([]*GettableTag, len(tags))
	for i, t := range tags {
		out[i] = NewGettableTagFromTag(t)
	}
	return out
}

func NewPostableTagFromTag(tag *Tag) PostableTag {
	return PostableTag{Key: tag.Key, Value: tag.Value}
}

func NewPostableTagsFromTags(tags []*Tag) []PostableTag {
	out := make([]PostableTag, len(tags))
	for i, t := range tags {
		out[i] = NewPostableTagFromTag(t)
	}
	return out
}

func NewTag(orgID valuer.UUID, kind coretypes.Kind, key, value string) *Tag {
	now := time.Now()
	return &Tag{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		Key:   key,
		Value: value,
		OrgID: orgID,
		Kind:  kind,
	}
}

// ValidatePostableTag trims and validates a user-supplied (key, value) pair.
// Returns the cleaned values on success. Entity-specific reserved-key checks
// (e.g. dashboard column names that would collide with the list-query DSL) are
// the caller's responsibility — perform them before calling into the tag module.
func ValidatePostableTag(p PostableTag) (string, string, error) {
	key := strings.TrimSpace(p.Key)
	value := strings.TrimSpace(p.Value)
	if key == "" {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidKey, "tag key cannot be empty")
	}
	if value == "" {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidValue, "tag value cannot be empty")
	}
	if !tagKeyRegex.MatchString(key) {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidKey, "tag key %q contains disallowed characters", key)
	}
	if !tagValueRegex.MatchString(value) {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidValue, "tag value %q contains disallowed characters", value)
	}
	if utf8.RuneCountInString(key) > MAX_LEN_TAG_KEY {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidKey, "tag key %q exceeds the %d-character limit", key, MAX_LEN_TAG_KEY)
	}
	if utf8.RuneCountInString(value) > MAX_LEN_TAG_VALUE {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidValue, "tag value %q exceeds the %d-character limit", value, MAX_LEN_TAG_VALUE)
	}
	return key, value, nil
}
