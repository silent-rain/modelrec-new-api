package common

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVerifySMSCodeWithContextDistinguishesRejectionFromGatewayFailure(t *testing.T) {
	originalBaseURL := ModelHubBaseURL
	t.Cleanup(func() { ModelHubBaseURL = originalBaseURL })

	t.Run("structured rejection is an invalid code", func(t *testing.T) {
		forwardedFor := make(chan string, 1)
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			forwardedFor <- r.Header.Get("X-Forwarded-For")
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":10294,"message":"invalid code"}`))
		}))
		defer server.Close()
		ModelHubBaseURL = server.URL

		ctx := WithSMSGatewayClientIP(context.Background(), "203.0.113.7")
		valid, err := VerifySMSCodeWithContext(ctx, "13800138000", "123456")

		require.NoError(t, err)
		assert.False(t, valid)
		assert.Equal(t, "203.0.113.7", <-forwardedFor)
	})

	t.Run("transport failure remains an error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			http.Error(w, "unavailable", http.StatusServiceUnavailable)
		}))
		defer server.Close()
		ModelHubBaseURL = server.URL

		valid, err := VerifySMSCodeWithContext(context.Background(), "13800138000", "123456")

		require.Error(t, err)
		assert.False(t, valid)
	})

	t.Run("structured gateway failure remains an error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":10297,"message":"provider unavailable"}`))
		}))
		defer server.Close()
		ModelHubBaseURL = server.URL

		valid, err := VerifySMSCodeWithContext(context.Background(), "13800138000", "123456")

		require.Error(t, err)
		assert.False(t, valid)
	})

	t.Run("missing business code cannot verify a user", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"message":"ok"}`))
		}))
		defer server.Close()
		ModelHubBaseURL = server.URL

		valid, err := VerifySMSCodeWithContext(context.Background(), "13800138000", "123456")

		require.Error(t, err)
		assert.False(t, valid)
	})
}
