package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/rules"
)

type CoachReply struct {
	Reply string `json:"reply"`
}

func (c *GroqClient) AskCoach(ctx context.Context, commitment *models.Commitment, progress rules.ProgressCalculation, question string) (string, error) {
	charityName := "your chosen charity"
	if commitment.Charity != nil {
		charityName = commitment.Charity.Name
	}

	systemPrompt := `You are the PledgePay Commitment Coach. You provide tactical, empathetic, grounded guidance to developers aiming to hit their pledge milestones.
Rules:
1. Always base your response directly on the provided real statistics (verified count, target count, days remaining, actual daily pace, required daily pace, and stake amount in ₹).
2. Never hallucinate numbers.
3. Be concise (2-4 short bullet points or sentences).
4. Provide concrete, actionable advice on how to pace commits/work over the remaining days.
5. Remind the developer that their pledge of ₹` + fmt.Sprintf("%d", commitment.AmountPaise/100) + ` is locked in escrow for ` + charityName + `.
Respond with JSON only in format: {"reply": "your structured response here"}`

	userPrompt := fmt.Sprintf(`Developer Question: "%s"

Commitment: "%s"
Current State:
- Target: %d %s
- Verified so far: %d %s
- Progress: %.1f%%
- Days Remaining: %d days
- Actual Pace: %.2f %s/day
- Required Pace to Finish on Time: %.2f %s/day
- Status: %s
- Stake: ₹%d (Escrow for %s)`,
		question,
		commitment.Title,
		progress.Target, commitment.Unit,
		progress.Verified, commitment.Unit,
		progress.ProgressPct,
		progress.DaysRemaining,
		progress.DailyPaceActual, commitment.Unit,
		progress.DailyPaceRequired, commitment.Unit,
		progress.Status,
		commitment.AmountPaise/100,
		charityName,
	)

	var coachRes CoachReply
	err := c.Complete(ctx, systemPrompt, userPrompt, &coachRes)
	if err != nil || strings.TrimSpace(coachRes.Reply) == "" {
		needed := progress.Target - progress.Verified
		if needed < 0 {
			needed = 0
		}
		fallback := fmt.Sprintf("You have completed %d of %d %s (%.1f%%). With %d days remaining, you need %.1f %s/day to hit your goal and secure your ₹%d stake for %s.",
			progress.Verified, progress.Target, commitment.Unit, progress.ProgressPct, progress.DaysRemaining, progress.DailyPaceRequired, commitment.Unit, commitment.AmountPaise/100, charityName)
		return fallback, nil
	}

	return coachRes.Reply, nil
}
