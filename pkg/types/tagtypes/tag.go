package tagtypes

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const MAX_LEN_TAG_KEY = 32
const MAX_LEN_TAG_VALUE = 32

var (
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

// Resolve canonicalizes a batch of user-supplied (key, value) tag pairs against
// the existing tags for an org. Lookup is case-insensitive on both key and
// value (matching the storage uniqueness rule); when an existing row matches,
// its display casing is reused. Inputs are deduped on (LOWER(key), LOWER(value));
// the first input's casing wins on collisions. Returns:
//   - toCreate: new Tag rows the caller should insert (with pre-generated IDs)
//   - matched: existing rows the caller's input already pointed to. They
//     already carry authoritative IDs from the store.
func Resolve(ctx context.Context, store Store, orgID valuer.UUID, kind coretypes.Kind, postable []PostableTag) ([]*Tag, []*Tag, error) {
	if len(postable) == 0 {
		return nil, nil, nil
	}

	existing, err := store.List(ctx, orgID, kind)
	if err != nil {
		return nil, nil, err
	}

	lowercaseTagsMap := make(map[string]*Tag, len(existing))
	for _, t := range existing {
		mapKey := strings.ToLower(t.Key) + "\x00" + strings.ToLower(t.Value)
		lowercaseTagsMap[mapKey] = t
	}

	seenInRequestAlready := make(map[string]struct{}, len(postable)) // postable can have the same tag multiple times
	toCreate := make([]*Tag, 0)
	matched := make([]*Tag, 0)

	for _, p := range postable {
		key, value, err := validatePostableTag(p)
		if err != nil {
			return nil, nil, err
		}
		lookup := strings.ToLower(key) + "\x00" + strings.ToLower(value)
		if _, dup := seenInRequestAlready[lookup]; dup {
			continue
		}
		seenInRequestAlready[lookup] = struct{}{}

		if existingTag, ok := lowercaseTagsMap[lookup]; ok {
			matched = append(matched, existingTag)
			continue
		}
		toCreate = append(toCreate, NewTag(orgID, kind, key, value))
	}

	return toCreate, matched, nil
}

// Entity-specific reserved-key checks (e.g. dashboard column names that would
// collide with the list-query DSL) are the caller's responsibility — perform
// them before calling into the tag module.
func validatePostableTag(p PostableTag) (string, string, error) {
	key := strings.TrimSpace(p.Key)
	value := strings.TrimSpace(p.Value)
	if key == "" {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidKey, "tag key cannot be empty")
	}
	if value == "" {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidValue, "tag value cannot be empty")
	}
	if strings.ContainsRune(key, '/') {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidKey, "tag key %q cannot contain '/'", key)
	}
	if strings.ContainsRune(value, '/') {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidValue, "tag value %q cannot contain '/'", value)
	}
	if utf8.RuneCountInString(key) > MAX_LEN_TAG_KEY {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidKey, "tag key %q exceeds the %d-character limit", key, MAX_LEN_TAG_KEY)
	}
	if utf8.RuneCountInString(value) > MAX_LEN_TAG_VALUE {
		return "", "", errors.Newf(errors.TypeInvalidInput, ErrCodeTagInvalidValue, "tag value %q exceeds the %d-character limit", value, MAX_LEN_TAG_VALUE)
	}
	return key, value, nil
}
