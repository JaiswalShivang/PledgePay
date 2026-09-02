package rules

import (
	"sort"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/models"
)

type ClusteringStats struct {
	TotalCount             int      `json:"total_count"`
	IsClustered            bool     `json:"is_clustered"`
	BurstCount             int      `json:"burst_count"`
	ShortestIntervalSec    int64    `json:"shortest_interval_sec"`
	AverageIntervalSec     int64    `json:"average_interval_sec"`
	SampleCommitMessages   []string `json:"sample_commit_messages"`
	RuleAnomalyFlag        bool     `json:"rule_anomaly_flag"`
	RuleAnomalyReason      string   `json:"rule_anomaly_reason,omitempty"`
}

func ComputeClusteringStats(evidence []models.Evidence) ClusteringStats {
	if len(evidence) == 0 {
		return ClusteringStats{
			TotalCount:          0,
			IsClustered:         false,
			BurstCount:          0,
			ShortestIntervalSec: 0,
			AverageIntervalSec:  0,
		}
	}

	sortedEv := make([]models.Evidence, len(evidence))
	copy(sortedEv, evidence)
	sort.Slice(sortedEv, func(i, j int) bool {
		return sortedEv[i].OccurredAt.Before(sortedEv[j].OccurredAt)
	})

	messages := make([]string, 0, len(sortedEv))
	for _, ev := range sortedEv {
		if msg, ok := ev.RawPayload["message"].(string); ok && msg != "" {
			messages = append(messages, msg)
		} else if title, ok := ev.RawPayload["title"].(string); ok && title != "" {
			messages = append(messages, title)
		}
	}
	if len(messages) > 5 {
		messages = messages[len(messages)-5:]
	}

	if len(sortedEv) == 1 {
		return ClusteringStats{
			TotalCount:           1,
			IsClustered:          false,
			BurstCount:           1,
			ShortestIntervalSec:  0,
			AverageIntervalSec:   0,
			SampleCommitMessages: messages,
		}
	}

	var shortestSec int64 = 86400 * 365
	var totalIntervalSec int64 = 0
	intervalsCount := len(sortedEv) - 1

	for i := 0; i < len(sortedEv)-1; i++ {
		diff := sortedEv[i+1].OccurredAt.Sub(sortedEv[i].OccurredAt)
		diffSec := int64(diff.Seconds())
		if diffSec < 0 {
			diffSec = -diffSec
		}
		if diffSec < shortestSec {
			shortestSec = diffSec
		}
		totalIntervalSec += diffSec
	}

	avgSec := totalIntervalSec / int64(intervalsCount)

	maxBurstIn3Min := 0
	for i := 0; i < len(sortedEv); i++ {
		currentCount := 1
		for j := i + 1; j < len(sortedEv); j++ {
			if sortedEv[j].OccurredAt.Sub(sortedEv[i].OccurredAt) <= 3*time.Minute {
				currentCount++
			} else {
				break
			}
		}
		if currentCount > maxBurstIn3Min {
			maxBurstIn3Min = currentCount
		}
	}

	isSuspicious := maxBurstIn3Min >= 5 || (len(sortedEv) >= 4 && shortestSec <= 5)
	reason := ""
	if isSuspicious {
		reason = "Suspicious burst detected: multiple evidence items created within seconds of each other"
	}

	return ClusteringStats{
		TotalCount:           len(sortedEv),
		IsClustered:          isSuspicious,
		BurstCount:           maxBurstIn3Min,
		ShortestIntervalSec:  shortestSec,
		AverageIntervalSec:   avgSec,
		SampleCommitMessages: messages,
		RuleAnomalyFlag:      isSuspicious,
		RuleAnomalyReason:    reason,
	}
}
