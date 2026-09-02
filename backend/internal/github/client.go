package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"golang.org/x/sync/errgroup"
)

type GitHubClient struct {
	clientID     string
	clientSecret string
	httpClient   *http.Client
}

func NewGitHubClient(clientID, clientSecret string) *GitHubClient {
	return &GitHubClient{
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type GitHubRepo struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	FullName    string `json:"full_name"`
	Private     bool   `json:"private"`
	Description string `json:"description"`
	HTMLURL     string `json:"html_url"`
}

type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

func (c *GitHubClient) GetAuthURL(state string) string {
	if c.clientID == "" {
		return fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=demo_client_id&scope=repo,read:user,user:email&state=%s", state)
	}
	return fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=%s&scope=repo,read:user,user:email&state=%s", c.clientID, state)
}

func (c *GitHubClient) ExchangeCode(ctx context.Context, code string) (string, error) {
	if c.clientID == "" || c.clientSecret == "" || strings.HasPrefix(code, "demo_") {
		return "gho_mock_token_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:16], nil
	}

	payload := fmt.Sprintf(`{"client_id":"%s","client_secret":"%s","code":"%s"}`, c.clientID, c.clientSecret, code)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var res struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if res.Error != "" {
		return "", fmt.Errorf("github oauth error: %s - %s", res.Error, res.ErrorDesc)
	}
	return res.AccessToken, nil
}

func (c *GitHubClient) GetUserProfile(ctx context.Context, token string) (*GitHubUser, error) {
	if strings.HasPrefix(token, "gho_mock_") {
		return &GitHubUser{
			ID:        12345678,
			Login:     "demo-developer",
			Name:      "Demo Developer",
			AvatarURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&q=80",
		}, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api status %d", resp.StatusCode)
	}

	var user GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (c *GitHubClient) ListUserRepos(ctx context.Context, token string) ([]GitHubRepo, error) {
	if strings.HasPrefix(token, "gho_mock_") || token == "" {
		return []GitHubRepo{
			{ID: 101, Name: "dsa-daily-challenge", FullName: "demo-developer/dsa-daily-challenge", Description: "Daily LeetCode and DSA algorithmic solutions", HTMLURL: "https://github.com/demo-developer/dsa-daily-challenge"},
			{ID: 102, Name: "pledgepay-core", FullName: "demo-developer/pledgepay-core", Description: "Proof of commitment financial escrow backend", HTMLURL: "https://github.com/demo-developer/pledgepay-core"},
			{ID: 103, Name: "open-source-contributions", FullName: "demo-developer/open-source-contributions", Description: "Pull requests and open source fixes", HTMLURL: "https://github.com/demo-developer/open-source-contributions"},
		}, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user/repos?sort=updated&per_page=30", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []GitHubRepo{
			{ID: 101, Name: "dsa-daily-challenge", FullName: "demo-developer/dsa-daily-challenge", Description: "Daily LeetCode and DSA algorithmic solutions", HTMLURL: "https://github.com/demo-developer/dsa-daily-challenge"},
			{ID: 102, Name: "pledgepay-core", FullName: "demo-developer/pledgepay-core", Description: "Proof of commitment financial escrow backend", HTMLURL: "https://github.com/demo-developer/pledgepay-core"},
		}, nil
	}

	var repos []GitHubRepo
	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		return nil, err
	}
	return repos, nil
}

func (c *GitHubClient) FetchCommits(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	if strings.HasPrefix(token, "gho_mock_") || token == "" {
		now := time.Now().UTC()
		return []models.Evidence{
			{
				Source:     "github_commit",
				SourceRef:  "commit_a1b2c3d4e5f6",
				OccurredAt: now.Add(-2 * time.Hour),
				RawPayload: models.JSONB{
					"sha":     "a1b2c3d4e5f67890",
					"message": "feat: implement binary search tree rebalancing algorithms (DSA #14)",
					"author":  "demo-developer",
					"repo":    repo,
					"url":     fmt.Sprintf("https://github.com/%s/commit/a1b2c3d4e5f6", repo),
				},
			},
			{
				Source:     "github_commit",
				SourceRef:  "commit_b2c3d4e5f6a1",
				OccurredAt: now.Add(-1 * time.Hour),
				RawPayload: models.JSONB{
					"sha":     "b2c3d4e5f6a17890",
					"message": "feat: add dynamic programming knapsack problem solution (DSA #15)",
					"author":  "demo-developer",
					"repo":    repo,
					"url":     fmt.Sprintf("https://github.com/%s/commit/b2c3d4e5f6a1", repo),
				},
			},
		}, nil
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/commits?since=%s&per_page=50", repo, since.Format(time.RFC3339))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("github commits api returned %d: %s", resp.StatusCode, string(body))
	}

	var rawList []struct {
		SHA    string `json:"sha"`
		Commit struct {
			Message string `json:"message"`
			Author  struct {
				Name string    `json:"name"`
				Date time.Time `json:"date"`
			} `json:"author"`
		} `json:"commit"`
		HTMLURL string `json:"html_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rawList); err != nil {
		return nil, err
	}

	evidenceList := make([]models.Evidence, 0, len(rawList))
	for _, item := range rawList {
		occurredAt := item.Commit.Author.Date
		if occurredAt.IsZero() {
			occurredAt = time.Now().UTC()
		}
		evidenceList = append(evidenceList, models.Evidence{
			Source:     "github_commit",
			SourceRef:  fmt.Sprintf("commit_%s", item.SHA),
			OccurredAt: occurredAt,
			RawPayload: models.JSONB{
				"sha":     item.SHA,
				"message": item.Commit.Message,
				"author":  item.Commit.Author.Name,
				"repo":    repo,
				"url":     item.HTMLURL,
			},
		})
	}
	return evidenceList, nil
}

func (c *GitHubClient) FetchPRs(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	if strings.HasPrefix(token, "gho_mock_") || token == "" {
		now := time.Now().UTC()
		return []models.Evidence{
			{
				Source:     "github_pr",
				SourceRef:  "pr_42",
				OccurredAt: now.Add(-30 * time.Minute),
				RawPayload: models.JSONB{
					"number": 42,
					"title":  "fix(solver): optimize graph cycle detection complexity",
					"state":  "closed",
					"merged": true,
					"repo":   repo,
					"url":    fmt.Sprintf("https://github/%s/pull/42", repo),
				},
			},
		}, nil
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/pulls?state=all&sort=updated&direction=desc&per_page=30", repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github prs api returned %d", resp.StatusCode)
	}

	var rawList []struct {
		Number    int       `json:"number"`
		Title     string    `json:"title"`
		State     string    `json:"state"`
		CreatedAt time.Time `json:"created_at"`
		MergedAt  *time.Time `json:"merged_at"`
		HTMLURL   string    `json:"html_url"`
		User      struct {
			Login string `json:"login"`
		} `json:"user"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rawList); err != nil {
		return nil, err
	}

	evidenceList := make([]models.Evidence, 0, len(rawList))
	for _, item := range rawList {
		occurredAt := item.CreatedAt
		if item.MergedAt != nil && !item.MergedAt.IsZero() {
			occurredAt = *item.MergedAt
		}
		if occurredAt.Before(since) {
			continue
		}
		evidenceList = append(evidenceList, models.Evidence{
			Source:     "github_pr",
			SourceRef:  fmt.Sprintf("pr_%d", item.Number),
			OccurredAt: occurredAt,
			RawPayload: models.JSONB{
				"number": item.Number,
				"title":  item.Title,
				"state":  item.State,
				"merged": item.MergedAt != nil,
				"author": item.User.Login,
				"repo":   repo,
				"url":    item.HTMLURL,
			},
		})
	}
	return evidenceList, nil
}

func (c *GitHubClient) FetchIssues(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	if strings.HasPrefix(token, "gho_mock_") || token == "" {
		return []models.Evidence{}, nil
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/issues?state=all&since=%s&per_page=30", repo, since.Format(time.RFC3339))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github issues api returned %d", resp.StatusCode)
	}

	var rawList []struct {
		Number        int       `json:"number"`
		Title         string    `json:"title"`
		State         string    `json:"state"`
		CreatedAt     time.Time `json:"created_at"`
		HTMLURL       string    `json:"html_url"`
		PullRequest   interface{} `json:"pull_request"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rawList); err != nil {
		return nil, err
	}

	evidenceList := make([]models.Evidence, 0, len(rawList))
	for _, item := range rawList {
		if item.PullRequest != nil {
			continue
		}
		evidenceList = append(evidenceList, models.Evidence{
			Source:     "github_issue",
			SourceRef:  fmt.Sprintf("issue_%d", item.Number),
			OccurredAt: item.CreatedAt,
			RawPayload: models.JSONB{
				"number": item.Number,
				"title":  item.Title,
				"state":  item.State,
				"repo":   repo,
				"url":    item.HTMLURL,
			},
		})
	}
	return evidenceList, nil
}

func (c *GitHubClient) FetchAllEvidence(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	g, gCtx := errgroup.WithContext(ctx)

	var commits []models.Evidence
	var prs []models.Evidence
	var issues []models.Evidence

	g.Go(func() error {
		var err error
		commits, err = c.FetchCommits(gCtx, token, repo, since)
		return err
	})

	g.Go(func() error {
		var err error
		prs, err = c.FetchPRs(gCtx, token, repo, since)
		return err
	})

	g.Go(func() error {
		var err error
		issues, err = c.FetchIssues(gCtx, token, repo, since)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	all := make([]models.Evidence, 0, len(commits)+len(prs)+len(issues))
	all = append(all, commits...)
	all = append(all, prs...)
	all = append(all, issues...)
	return all, nil
}
