package delta

import (
	"fmt"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// groupingSets returns a string of comma separated tags for group by clause
// `ts` is always added to the group by clause
func groupingSets(tags ...string) string {
	withTs := append(tags, "ts")
	if len(withTs) > 1 {
		return fmt.Sprintf(`GROUPING SETS ( (%s), (%s) )`, strings.Join(withTs, ", "), strings.Join(tags, ", "))
	} else {
		return strings.Join(withTs, ", ")
	}
}

// groupingSetsByAttributeKeyTags returns a string of comma separated tags for group by clause
func groupingSetsByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, tag.Key)
	}
	return groupingSets(groupTags...)
}

// groupBy returns a string of comma separated tags for group by clause
func groupByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, tag.Key)
	}
	groupTags = append(groupTags, "ts")
	return strings.Join(groupTags, ", ")
}

// orderBy returns a string of comma separated tags for order by clause
// if the order is not specified, it defaults to ASC
func orderByAttributeKeyTags(items []v3.OrderBy, tags []v3.AttributeKey) string {
	var orderBy []string
	for _, tag := range tags {
		found := false
		for _, item := range items {
			if item.ColumnName == tag.Key {
				found = true
				orderBy = append(orderBy, fmt.Sprintf("%s %s", item.ColumnName, item.Order))
				break
			}
		}
		if !found {
			orderBy = append(orderBy, fmt.Sprintf("%s ASC", tag.Key))
		}
	}

	orderBy = append(orderBy, "ts ASC")

	return strings.Join(orderBy, ", ")
}
