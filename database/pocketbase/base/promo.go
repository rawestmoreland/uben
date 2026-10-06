package main

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

// promoAppKey is the same shared app key used by the purchase_events and
// quiz_results collection rules (EXPO_PUBLIC_PB_API_KEY in the app).
const promoAppKey = "0LEA3wy4uPfnZ3prfk8cWLmV55oDvyC4dRWVxNMRTmY="

const (
	promoRateLimitMax    = 10               // attempts per window, per client IP
	promoRateLimitWindow = 10 * time.Minute // window length
)

var (
	errPromoInvalid   = errors.New("invalid")
	errPromoExpired   = errors.New("expired")
	errPromoExhausted = errors.New("exhausted")
)

type promoRedeemRequest struct {
	Code string `json:"code"`
}

// promoLimiter is a small in-memory fixed-window limiter keyed by client IP so
// codes can't be brute-forced. State resets on restart, which is acceptable
// for a single-instance deployment.
type promoLimiter struct {
	mu      sync.Mutex
	entries map[string]*promoLimitEntry
}

type promoLimitEntry struct {
	count       int
	windowStart time.Time
}

var redeemLimiter = &promoLimiter{entries: map[string]*promoLimitEntry{}}

func (l *promoLimiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	// Drop expired windows so the map can't grow without bound.
	for k, entry := range l.entries {
		if now.Sub(entry.windowStart) > promoRateLimitWindow {
			delete(l.entries, k)
		}
	}

	entry, ok := l.entries[key]
	if !ok {
		l.entries[key] = &promoLimitEntry{count: 1, windowStart: now}
		return true
	}
	entry.count++
	return entry.count <= promoRateLimitMax
}

// registerPromoRoutes adds POST /api/promo/redeem.
func registerPromoRoutes(se *core.ServeEvent) {
	se.Router.POST("/api/promo/redeem", func(e *core.RequestEvent) error {
		// Same shared app key as purchase_events.
		key := e.Request.URL.Query().Get("key")
		if subtle.ConstantTimeCompare([]byte(key), []byte(promoAppKey)) != 1 {
			return e.JSON(http.StatusForbidden, map[string]any{"valid": false, "reason": "forbidden"})
		}

		if !redeemLimiter.allow(e.RealIP()) {
			return e.JSON(http.StatusTooManyRequests, map[string]any{"valid": false, "reason": "rate_limited"})
		}

		var body promoRedeemRequest
		if err := e.BindBody(&body); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{"valid": false, "reason": "invalid"})
		}

		code := strings.ToUpper(strings.TrimSpace(body.Code))
		if code == "" {
			return e.JSON(http.StatusNotFound, map[string]any{"valid": false, "reason": "invalid"})
		}

		// Check and increment in ONE transaction so two simultaneous
		// redemptions can't exceed max_uses (SQLite serializes writers).
		err := e.App.RunInTransaction(func(txApp core.App) error {
			record, err := txApp.FindFirstRecordByData("promo_codes", "code", code)
			if err != nil {
				return errPromoInvalid
			}
			// Same generic error for unknown and inactive so inactive codes
			// can't be probed.
			if !record.GetBool("active") {
				return errPromoInvalid
			}

			expiresAt := record.GetDateTime("expires_at")
			if !expiresAt.IsZero() && expiresAt.Time().Before(time.Now()) {
				return errPromoExpired
			}

			maxUses := record.GetInt("max_uses")
			if maxUses > 0 && record.GetInt("use_count") >= maxUses {
				return errPromoExhausted
			}

			record.Set("use_count", record.GetInt("use_count")+1)
			return txApp.Save(record)
		})

		switch {
		case err == nil:
			return e.JSON(http.StatusOK, map[string]any{"valid": true})
		case errors.Is(err, errPromoInvalid):
			return e.JSON(http.StatusNotFound, map[string]any{"valid": false, "reason": "invalid"})
		case errors.Is(err, errPromoExpired):
			return e.JSON(http.StatusGone, map[string]any{"valid": false, "reason": "expired"})
		case errors.Is(err, errPromoExhausted):
			return e.JSON(http.StatusConflict, map[string]any{"valid": false, "reason": "exhausted"})
		default:
			e.App.Logger().Error("promo redeem failed", "error", err)
			return e.JSON(http.StatusInternalServerError, map[string]any{"valid": false, "reason": "error"})
		}
	})
}
