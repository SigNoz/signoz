package impltag

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// resolve canonicalizes a batch of user-supplied (key, value) tag pairs against
// the existing tags for an org. Lookup is case-insensitive on both key and
// value (matching the storage uniqueness rule); when an existing row matches,
// its display casing is reused. Inputs are deduped on (LOWER(key), LOWER(value));
// the first input's casing wins on collisions. Returns:
//   - toCreate: new Tag rows the caller should insert (with pre-generated IDs)
//   - matched: existing rows the caller's input already pointed to. They
//     already carry authoritative IDs from the store.
func (m *module) resolve(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, postable []tagtypes.PostableTag) ([]*tagtypes.Tag, []*tagtypes.Tag, error) {
	if len(postable) == 0 {
		return nil, nil, nil
	}

	existing, err := m.store.List(ctx, orgID, kind)
	if err != nil {
		return nil, nil, err
	}

	lowercaseTagsMap := make(map[string]*tagtypes.Tag, len(existing))
	for _, t := range existing {
		mapKey := strings.ToLower(t.Key) + "\x00" + strings.ToLower(t.Value)
		lowercaseTagsMap[mapKey] = t
	}

	seenInRequestAlready := make(map[string]struct{}, len(postable)) // postable can have the same tag multiple times
	toCreate := make([]*tagtypes.Tag, 0)
	matched := make([]*tagtypes.Tag, 0)

	for _, p := range postable {
		key, value, err := tagtypes.ValidatePostableTag(p)
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
		toCreate = append(toCreate, tagtypes.NewTag(orgID, kind, key, value))
	}

	return toCreate, matched, nil
}
