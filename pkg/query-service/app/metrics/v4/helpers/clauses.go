package helpers

import (
	"fmt"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// groupingSets returns a string of comma separated tags for group by clause
// `ts` is always added to the group by clause
func groupingSets(tags ...string) string {
	withTs := append(tags, "ts")
	return strings.Join(withTs, ", ")
}

// GroupingSetsByAttributeKeyTags returns a string of comma separated tags for group by clause
func GroupingSetsByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		tag.Key = utils.AddBackTickToFormatTag(tag.Key)
		groupTags = append(groupTags, tag.Key)
	}
	return groupingSets(groupTags...)
}

// GroupByAttributeKeyTags returns a string of comma separated tags for group by clause
func GroupByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		tag.Key = utils.AddBackTickToFormatTag(tag.Key)
		groupTags = append(groupTags, tag.Key)
	}
	groupTags = append(groupTags, "ts")
	return strings.Join(groupTags, ", ")
}

// OrderByAttributeKeyTags returns a string of comma separated tags for order by clause
// if the order is not specified, it defaults to ASC
func OrderByAttributeKeyTags(items []v3.OrderBy, tags []v3.AttributeKey) string {
	var orderBy []string
	for _, tag := range tags {
		found := false
		for _, item := range items {
			if item.ColumnName == tag.Key {
				found = true
				item.ColumnName = utils.AddBackTickToFormatTag(item.ColumnName)
				orderBy = append(orderBy, fmt.Sprintf("%s %s", item.ColumnName, item.Order))
				break
			}
		}
		if !found {
			tag.Key = utils.AddBackTickToFormatTag(tag.Key)
			orderBy = append(orderBy, fmt.Sprintf("%s ASC", tag.Key))
		}
	}

	orderBy = append(orderBy, "ts ASC")

	return strings.Join(orderBy, ", ")
}

func SelectLabelsAny(tags []v3.AttributeKey) string {
	var selectLabelsAny []string
	for _, tag := range tags {
		tag.Key = utils.AddBackTickToFormatTag(tag.Key)
		selectLabelsAny = append(selectLabelsAny, fmt.Sprintf("any(%s) as %s,", tag.Key, tag.Key))
	}
	return strings.Join(selectLabelsAny, " ")
}

func SelectLabels(tags []v3.AttributeKey) string {
	var selectLabels []string
	for _, tag := range tags {
		tag.Key = utils.AddBackTickToFormatTag(tag.Key)
		selectLabels = append(selectLabels, fmt.Sprintf("%s,", tag.Key))
	}
	return strings.Join(selectLabels, " ")
}
