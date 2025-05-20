package telemetry

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"go.uber.org/zap"
)

func GetViews(ctx context.Context, sqlstore sqlstore.SQLStore, orgID string) ([]*v3.SavedView, error) {
	var views []types.SavedView
	err := sqlstore.BunDB().NewSelect().Model(&views).Where("org_id = ?", orgID).Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("error in getting saved views: %s", err.Error())
	}

	var savedViews []*v3.SavedView
	for _, view := range views {
		var compositeQuery v3.CompositeQuery
		err = json.Unmarshal([]byte(view.Data), &compositeQuery)
		if err != nil {
			return nil, fmt.Errorf("error in unmarshalling explorer query data: %s", err.Error())
		}
		savedViews = append(savedViews, &v3.SavedView{
			ID:             view.ID,
			Name:           view.Name,
			Category:       view.Category,
			CreatedAt:      view.CreatedAt,
			CreatedBy:      view.CreatedBy,
			UpdatedAt:      view.UpdatedAt,
			UpdatedBy:      view.UpdatedBy,
			Tags:           strings.Split(view.Tags, ","),
			SourcePage:     view.SourcePage,
			CompositeQuery: &compositeQuery,
			ExtraData:      view.ExtraData,
		})
	}
	return savedViews, nil
}

func GetSavedViewsInfo(ctx context.Context, sqlstore sqlstore.SQLStore) (*model.SavedViewsInfo, error) {
	savedViewsInfo := model.SavedViewsInfo{}
	// get single org ID from db
	var orgIDs []string
	err := sqlstore.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs)
	if err != nil {
		return nil, fmt.Errorf("error in getting org IDs: %s", err.Error())
	}
	if len(orgIDs) != 1 {
		zap.S().Warn("GetSavedViewsInfo: Zero or multiple org IDs found in the database", zap.Int("orgIDs", len(orgIDs)))
		return &savedViewsInfo, nil
	}
	savedViews, err := GetViews(ctx, sqlstore, orgIDs[0])
	if err != nil {
		zap.S().Debug("Error in fetching saved views info: ", err)
		return &savedViewsInfo, err
	}

	savedViewsInfo.TotalSavedViews = len(savedViews)
	for _, view := range savedViews {
		if view.SourcePage == "traces" {
			savedViewsInfo.TracesSavedViews += 1
		} else if view.SourcePage == "logs" {
			savedViewsInfo.LogsSavedViews += 1

			for _, query := range view.CompositeQuery.BuilderQueries {
				if query.Filters != nil {
					for _, item := range query.Filters.Items {
						if slices.Contains([]string{"contains", "ncontains", "like", "nlike"}, string(item.Operator)) {
							if item.Key.Key != "body" {
								savedViewsInfo.LogsSavedViewWithContainsOp += 1
							}
						}
					}
				}
			}
		}
	}
	return &savedViewsInfo, nil
}
