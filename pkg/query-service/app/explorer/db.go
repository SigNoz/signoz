package explorer

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
)

var store sqlstore.SQLStore

// InitWithDSN sets up setting up the connection pool global variable.
func InitWithDSN(sqlStore sqlstore.SQLStore) error {
	store = sqlStore
	telemetry.GetInstance().SetSavedViewsInfoCallback(GetSavedViewsInfo)

	return nil
}

func InitWithDB(sqlStore sqlstore.SQLStore) {
	store = sqlStore
}

func GetViews(ctx context.Context, orgID string) ([]*v3.SavedView, error) {
	var views []types.SavedView
	err := store.BunDB().NewSelect().Model(&views).Where("org_id = ?", orgID).Scan(ctx)
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

func GetViewsForFilters(ctx context.Context, orgID string, sourcePage string, name string, category string) ([]*v3.SavedView, error) {
	var views []types.SavedView
	var err error
	if len(category) == 0 {
		err = store.BunDB().NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND name LIKE ?", orgID, sourcePage, "%"+name+"%").Scan(ctx)
	} else {
		err = store.BunDB().NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND category LIKE ? AND name LIKE ?", orgID, sourcePage, "%"+category+"%", "%"+name+"%").Scan(ctx)
	}
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

func CreateView(ctx context.Context, orgID string, view v3.SavedView) (valuer.UUID, error) {
	data, err := json.Marshal(view.CompositeQuery)
	if err != nil {
		return valuer.UUID{}, fmt.Errorf("error in marshalling explorer query data: %s", err.Error())
	}

	uuid := valuer.GenerateUUID()
	createdAt := time.Now()
	updatedAt := time.Now()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return valuer.UUID{}, fmt.Errorf("error in getting email from context")
	}

	createBy := claims.Email
	updatedBy := claims.Email

	dbView := types.SavedView{
		TimeAuditable: types.TimeAuditable{
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: createBy,
			UpdatedBy: updatedBy,
		},
		OrgID: orgID,
		Identifiable: types.Identifiable{
			ID: uuid,
		},
		Name:       view.Name,
		Category:   view.Category,
		SourcePage: view.SourcePage,
		Tags:       strings.Join(view.Tags, ","),
		Data:       string(data),
		ExtraData:  view.ExtraData,
	}

	_, err = store.BunDB().NewInsert().Model(&dbView).Exec(ctx)
	if err != nil {
		return valuer.UUID{}, fmt.Errorf("error in creating saved view: %s", err.Error())
	}
	return uuid, nil
}

func GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*v3.SavedView, error) {
	var view types.SavedView
	err := store.BunDB().NewSelect().Model(&view).Where("org_id = ? AND id = ?", orgID, uuid.StringValue()).Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("error in getting saved view: %s", err.Error())
	}

	var compositeQuery v3.CompositeQuery
	err = json.Unmarshal([]byte(view.Data), &compositeQuery)
	if err != nil {
		return nil, fmt.Errorf("error in unmarshalling explorer query data: %s", err.Error())
	}
	return &v3.SavedView{
		ID:             view.ID,
		Name:           view.Name,
		Category:       view.Category,
		CreatedAt:      view.CreatedAt,
		CreatedBy:      view.CreatedBy,
		UpdatedAt:      view.UpdatedAt,
		UpdatedBy:      view.UpdatedBy,
		SourcePage:     view.SourcePage,
		Tags:           strings.Split(view.Tags, ","),
		CompositeQuery: &compositeQuery,
		ExtraData:      view.ExtraData,
	}, nil
}

func UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view v3.SavedView) error {
	data, err := json.Marshal(view.CompositeQuery)
	if err != nil {
		return fmt.Errorf("error in marshalling explorer query data: %s", err.Error())
	}

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return fmt.Errorf("error in getting email from context")
	}

	updatedAt := time.Now()
	updatedBy := claims.Email

	_, err = store.BunDB().NewUpdate().
		Model(&types.SavedView{}).
		Set("updated_at = ?, updated_by = ?, name = ?, category = ?, source_page = ?, tags = ?, data = ?, extra_data = ?",
			updatedAt, updatedBy, view.Name, view.Category, view.SourcePage, strings.Join(view.Tags, ","), data, view.ExtraData).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error in updating saved view: %s", err.Error())
	}
	return nil
}

func DeleteView(ctx context.Context, orgID string, uuid valuer.UUID) error {
	_, err := store.BunDB().NewDelete().
		Model(&types.SavedView{}).
		Where("id = ?", uuid.StringValue()).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error in deleting explorer query: %s", err.Error())
	}
	return nil
}

func GetSavedViewsInfo(ctx context.Context) (*model.SavedViewsInfo, error) {
	savedViewsInfo := model.SavedViewsInfo{}
	// get single org ID from db
	var orgIDs []string
	err := store.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs)
	if err != nil {
		return nil, fmt.Errorf("error in getting org IDs: %s", err.Error())
	}
	if len(orgIDs) != 1 {
		zap.S().Warn("GetSavedViewsInfo: Zero or multiple org IDs found in the database", zap.Int("orgIDs", len(orgIDs)))
		return &savedViewsInfo, nil
	}
	savedViews, err := GetViews(ctx, orgIDs[0])
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
