package github

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"golang.org/x/sync/errgroup"
)

type GitHubClient struct {
	clientID     string
	clientSecret string
	httpClient   *http.Client
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
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
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

func (c *GitHubClient) GetAuthURL(state string) string {
	return fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=%s&scope=repo,read:user,user:email&state=%s", c.clientID, state)
}

func (c *GitHubClient) ExchangeCode(ctx context.Context, code string) (string, error) {
	payload := url.Values{
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"code":          {code},
	}.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github token exchange failed with status: %d", resp.StatusCode)
	}

	var res struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		Scope       string `json:"scope"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if res.Error != "" {
		return "", fmt.Errorf("github oauth error: %s (%s)", res.Error, res.ErrorDesc)
	}
	if res.AccessToken == "" {
		return "", errors.New("empty access token from github")
	}

	return res.AccessToken, nil
}

func (c *GitHubClient) GetUserProfile(ctx context.Context, token string) (*GitHubUser, error) {
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
		return nil, fmt.Errorf("failed to fetch github user profile: status %d", resp.StatusCode)
	}

	var user GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (c *GitHubClient) ListUserRepos(ctx context.Context, token string) ([]GitHubRepo, error) {
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
		return []GitHubRepo{}, nil
	}

	var repos []GitHubRepo
	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		return nil, err
	}
	return repos, nil
}

func (c *GitHubClient) FetchCommits(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/commits?since=%s&per_page=50", repo, since.Format(time.RFC3339))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []models.Evidence{}, nil
	}

	var apiCommits []struct {
		SHA    string `json:"sha"`
		Commit struct {
			Message string `json:"message"`
			Author  struct {
				Name string    `json:"name"`
				Date time.Time `json:"date"`
			} `json:"author"`
		} `json:"commit"`
		Author struct {
			Login string `json:"login"`
		} `json:"author"`
		HTMLURL string `json:"html_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiCommits); err != nil {
		return nil, err
	}

	var items []models.Evidence
	for _, item := range apiCommits {
		authorName := item.Author.Login
		if authorName == "" {
			authorName = item.Commit.Author.Name
		}
		occurredAt := item.Commit.Author.Date
		if occurredAt.IsZero() {
			occurredAt = time.Now().UTC()
		}

		items = append(items, models.Evidence{
			Source:     "github_commit",
			SourceRef:  fmt.Sprintf("commit_%s", item.SHA),
			OccurredAt: occurredAt,
			RawPayload: models.JSONB{
				"sha":     item.SHA,
				"message": item.Commit.Message,
				"author":  authorName,
				"repo":    repo,
				"url":     item.HTMLURL,
			},
		})
	}
	return items, nil
}

func (c *GitHubClient) FetchPullRequests(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/pulls?state=all&sort=updated&direction=desc&per_page=30", repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []models.Evidence{}, nil
	}

	var apiPRs []struct {
		ID        int64      `json:"id"`
		Number    int        `json:"number"`
		Title     string     `json:"title"`
		State     string     `json:"state"`
		CreatedAt time.Time  `json:"created_at"`
		MergedAt  *time.Time `json:"merged_at"`
		HTMLURL   string     `json:"html_url"`
		User      struct {
			Login string `json:"login"`
		} `json:"user"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiPRs); err != nil {
		return nil, err
	}

	var items []models.Evidence
	for _, pr := range apiPRs {
		if pr.CreatedAt.Before(since) && (pr.MergedAt == nil || pr.MergedAt.Before(since)) {
			continue
		}

		isMerged := pr.MergedAt != nil
		occurredAt := pr.CreatedAt
		if isMerged {
			occurredAt = *pr.MergedAt
		}

		items = append(items, models.Evidence{
			Source:     "github_pr",
			SourceRef:  fmt.Sprintf("pr_%d", pr.Number),
			OccurredAt: occurredAt,
			RawPayload: models.JSONB{
				"number": pr.Number,
				"title":  pr.Title,
				"state":  pr.State,
				"merged": isMerged,
				"author": pr.User.Login,
				"repo":   repo,
				"url":    pr.HTMLURL,
			},
		})
	}
	return items, nil
}

func (c *GitHubClient) FetchIssues(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/issues?state=all&since=%s&per_page=30", repo, since.Format(time.RFC3339))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []models.Evidence{}, nil
	}

	var apiIssues []struct {
		ID            int64     `json:"id"`
		Number        int       `json:"number"`
		Title         string    `json:"title"`
		State         string    `json:"state"`
		CreatedAt     time.Time `json:"created_at"`
		HTMLURL       string    `json:"html_url"`
		PullRequest   *struct{} `json:"pull_request,omitempty"`
		User          struct {
			Login string `json:"login"`
		} `json:"user"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiIssues); err != nil {
		return nil, err
	}

	var items []models.Evidence
	for _, issue := range apiIssues {
		if issue.PullRequest != nil {
			continue
		}

		items = append(items, models.Evidence{
			Source:     "github_issue",
			SourceRef:  fmt.Sprintf("issue_%d", issue.Number),
			OccurredAt: issue.CreatedAt,
			RawPayload: models.JSONB{
				"number": issue.Number,
				"title":  issue.Title,
				"state":  issue.State,
				"author": issue.User.Login,
				"repo":   repo,
				"url":    issue.HTMLURL,
			},
		})
	}
	return items, nil
}

func (c *GitHubClient) FetchAllEvidence(ctx context.Context, token, repo string, since time.Time) ([]models.Evidence, error) {
	g, gctx := errgroup.WithContext(ctx)

	var commits []models.Evidence
	var prs []models.Evidence
	var issues []models.Evidence

	g.Go(func() error {
		var err error
		commits, err = c.FetchCommits(gctx, token, repo, since)
		return err
	})

	g.Go(func() error {
		var err error
		prs, err = c.FetchPullRequests(gctx, token, repo, since)
		return err
	})

	g.Go(func() error {
		var err error
		issues, err = c.FetchIssues(gctx, token, repo, since)
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
