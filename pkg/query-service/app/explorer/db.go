package explorer

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

var db *sqlx.DB

type SavedView struct {
	UUID       string    `json:"uuid" db:"uuid"`
	Name       string    `json:"name" db:"name"`
	Category   string    `json:"category" db:"category"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	CreatedBy  string    `json:"created_by" db:"created_by"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
	UpdatedBy  string    `json:"updated_by" db:"updated_by"`
	SourcePage string    `json:"source_page" db:"source_page"`
	Tags       string    `json:"tags" db:"tags"`
	Data       string    `json:"data" db:"data"`
	ExtraData  string    `json:"extra_data" db:"extra_data"`
}

// InitWithDSN sets up setting up the connection pool global variable.
func InitWithDSN(inputDB *sqlx.DB) error {
	db = inputDB
	telemetry.GetInstance().SetSavedViewsInfoCallback(GetSavedViewsInfo)

	return nil
}

func InitWithDB(sqlDB *sqlx.DB) {
	db = sqlDB
}

func GetViews() ([]*v3.SavedView, error) {
	var views []SavedView
	err := db.Select(&views, "SELECT * FROM saved_views")
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

func GetViewsForFilters(sourcePage string, name string, category string) ([]*v3.SavedView, error) {
	var views []SavedView
	var err error
	if len(category) == 0 {
		err = db.Select(&views, "SELECT * FROM saved_views WHERE source_page = ? AND name LIKE ?", sourcePage, "%"+name+"%")
	} else {
		err = db.Select(&views, "SELECT * FROM saved_views WHERE source_page = ? AND category LIKE ? AND name LIKE ?", sourcePage, "%"+category+"%", "%"+name+"%")
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

func CreateView(ctx context.Context, view v3.SavedView) (string, error) {
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

	_, err = db.Exec(
		"INSERT INTO saved_views (uuid, name, category, created_at, created_by, updated_at, updated_by, source_page, tags, data, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		uuid_,
		view.Name,
		view.Category,
		createdAt,
		createBy,
		updatedAt,
		updatedBy,
		view.SourcePage,
		strings.Join(view.Tags, ","),
		data,
		view.ExtraData,
	)
	if err != nil {
		return "", fmt.Errorf("error in creating saved view: %s", err.Error())
	}
	return uuid_, nil
}

func GetView(uuid_ string) (*v3.SavedView, error) {
	var view SavedView
	err := db.Get(&view, "SELECT * FROM saved_views WHERE uuid = ?", uuid_)
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

func UpdateView(ctx context.Context, uuid_ string, view v3.SavedView) error {
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

	_, err = db.Exec("UPDATE saved_views SET updated_at = ?, updated_by = ?, name = ?, category = ?, source_page = ?, tags = ?, data = ?, extra_data = ? WHERE uuid = ?",
		updatedAt, updatedBy, view.Name, view.Category, view.SourcePage, strings.Join(view.Tags, ","), data, view.ExtraData, uuid_)
	if err != nil {
		return fmt.Errorf("error in updating saved view: %s", err.Error())
	}
	return nil
}

func DeleteView(uuid_ string) error {
	_, err := db.Exec("DELETE FROM saved_views WHERE uuid = ?", uuid_)
	if err != nil {
		return fmt.Errorf("error in deleting explorer query: %s", err.Error())
	}
	return nil
}

func GetSavedViewsInfo(ctx context.Context) (*model.SavedViewsInfo, error) {
	savedViewsInfo := model.SavedViewsInfo{}
	savedViews, err := GetViews()
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
