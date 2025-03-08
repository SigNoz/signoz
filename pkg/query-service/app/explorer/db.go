package explorer

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/types"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

var db *bun.DB

// InitWithDSN sets up setting up the connection pool global variable.
func InitWithDSN(inputDB *bun.DB) error {
	db = inputDB
	telemetry.GetInstance().SetSavedViewsInfoCallback(GetSavedViewsInfo)

	return nil
}

func InitWithDB(bunDB *bun.DB) {
	db = bunDB
}

func GetViews(ctx context.Context, orgID string) ([]*v3.SavedView, error) {
	var views []types.SavedView
	err := db.NewSelect().Model(&views).Where("org_id = ?", orgID).Scan(ctx)
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
			UUID:           view.UUID,
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
		err = db.NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND name LIKE ?", orgID, sourcePage, "%"+name+"%").Scan(ctx)
	} else {
		err = db.NewSelect().Model(&views).Where("org_id = ? AND source_page = ? AND category LIKE ? AND name LIKE ?", orgID, sourcePage, "%"+category+"%", "%"+name+"%").Scan(ctx)
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
			UUID:           view.UUID,
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

func CreateView(ctx context.Context, orgID string, view v3.SavedView) (string, error) {
	data, err := json.Marshal(view.CompositeQuery)
	if err != nil {
		return "", fmt.Errorf("error in marshalling explorer query data: %s", err.Error())
	}

	uuid_ := view.UUID

	if uuid_ == "" {
		uuid_ = uuid.New().String()
	}
	createdAt := time.Now()
	updatedAt := time.Now()

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return "", fmt.Errorf("error in getting email from context")
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
		OrgID:      orgID,
		UUID:       uuid_,
		Name:       view.Name,
		Category:   view.Category,
		SourcePage: view.SourcePage,
		Tags:       strings.Join(view.Tags, ","),
		Data:       string(data),
		ExtraData:  view.ExtraData,
	}

	_, err = db.NewInsert().Model(&dbView).Exec(ctx)
	if err != nil {
		return "", fmt.Errorf("error in creating saved view: %s", err.Error())
	}
	return uuid_, nil
}

func GetView(ctx context.Context, orgID string, uuid_ string) (*v3.SavedView, error) {
	var view types.SavedView
	err := db.NewSelect().Model(&view).Where("org_id = ? AND uuid = ?", orgID, uuid_).Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("error in getting saved view: %s", err.Error())
	}

	var compositeQuery v3.CompositeQuery
	err = json.Unmarshal([]byte(view.Data), &compositeQuery)
	if err != nil {
		return nil, fmt.Errorf("error in unmarshalling explorer query data: %s", err.Error())
	}
	return &v3.SavedView{
		UUID:           view.UUID,
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

func UpdateView(ctx context.Context, orgID string, uuid_ string, view v3.SavedView) error {
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

	_, err = db.NewUpdate().
		Model(&types.SavedView{}).
		Set("updated_at = ?, updated_by = ?, name = ?, category = ?, source_page = ?, tags = ?, data = ?, extra_data = ?",
			updatedAt, updatedBy, view.Name, view.Category, view.SourcePage, strings.Join(view.Tags, ","), data, view.ExtraData).
		Where("uuid = ?", uuid_).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error in updating saved view: %s", err.Error())
	}
	return nil
}

func DeleteView(ctx context.Context, orgID string, uuid_ string) error {
	_, err := db.NewDelete().
		Model(&types.SavedView{}).
		Where("uuid = ?", uuid_).
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
	err := db.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs)
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
