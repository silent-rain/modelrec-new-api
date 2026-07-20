package common

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVerifyAliyunCaptcha(t *testing.T) {
	originalBaseURL := ModelHubBaseURL
	originalSceneID := AliyunCaptchaSceneID
	t.Cleanup(func() {
		ModelHubBaseURL = originalBaseURL
		AliyunCaptchaSceneID = originalSceneID
	})

	AliyunCaptchaSceneID = "scene-login"

	t.Run("forwards the original token and configured scene", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/api/v2/auth/captcha/verify" {
				t.Fatalf("unexpected path: %s", r.URL.Path)
			}

			var payload struct {
				CaptchaVerifyParam string `json:"captcha_verify_param"`
				SceneID            string `json:"scene_id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode request: %v", err)
			}
			if payload.CaptchaVerifyParam != "captcha-token" {
				t.Fatalf("unexpected captcha token: %q", payload.CaptchaVerifyParam)
			}
			if payload.SceneID != "scene-login" {
				t.Fatalf("unexpected scene id: %q", payload.SceneID)
			}

			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":0,"message":"ok","data":{"message":"验证成功"}}`))
		}))
		defer server.Close()

		ModelHubBaseURL = server.URL
		verified, err := VerifyAliyunCaptcha(context.Background(), "captcha-token")
		if err != nil {
			t.Fatalf("verify captcha: %v", err)
		}
		if !verified {
			t.Fatal("expected captcha to be verified")
		}
	})

	t.Run("returns the microservice business error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":40001,"message":"验证码校验失败"}`))
		}))
		defer server.Close()

		ModelHubBaseURL = server.URL
		verified, err := VerifyAliyunCaptcha(context.Background(), "invalid-token")
		if err == nil {
			t.Fatal("expected a verification error")
		}
		if verified {
			t.Fatal("expected captcha verification to fail")
		}
	})
}

func TestIsAliyunCaptchaConfigured(t *testing.T) {
	originalEnabled := AliyunCaptchaEnabled
	originalRegion := AliyunCaptchaRegion
	originalPrefix := AliyunCaptchaPrefix
	originalSceneID := AliyunCaptchaSceneID
	t.Cleanup(func() {
		AliyunCaptchaEnabled = originalEnabled
		AliyunCaptchaRegion = originalRegion
		AliyunCaptchaPrefix = originalPrefix
		AliyunCaptchaSceneID = originalSceneID
	})

	AliyunCaptchaEnabled = true
	AliyunCaptchaPrefix = "captcha-prefix"
	AliyunCaptchaSceneID = "scene-login"

	AliyunCaptchaRegion = "cn"
	require.True(t, IsAliyunCaptchaPublicConfigComplete())
	assert.True(t, IsAliyunCaptchaConfigured())

	AliyunCaptchaEnabled = false
	assert.True(t, IsAliyunCaptchaPublicConfigComplete())
	assert.False(t, IsAliyunCaptchaConfigured())

	AliyunCaptchaRegion = "unknown"
	assert.False(t, IsAliyunCaptchaPublicConfigComplete())
}

func TestGetHumanVerificationProvider(t *testing.T) {
	originalProvider := HumanVerificationProvider
	originalAliyunEnabled := AliyunCaptchaEnabled
	originalRegion := AliyunCaptchaRegion
	originalPrefix := AliyunCaptchaPrefix
	originalSceneID := AliyunCaptchaSceneID
	originalTurnstileEnabled := TurnstileCheckEnabled
	t.Cleanup(func() {
		HumanVerificationProvider = originalProvider
		AliyunCaptchaEnabled = originalAliyunEnabled
		AliyunCaptchaRegion = originalRegion
		AliyunCaptchaPrefix = originalPrefix
		AliyunCaptchaSceneID = originalSceneID
		TurnstileCheckEnabled = originalTurnstileEnabled
	})

	AliyunCaptchaEnabled = true
	AliyunCaptchaRegion = "cn"
	AliyunCaptchaPrefix = "captcha-prefix"
	AliyunCaptchaSceneID = "scene-login"
	TurnstileCheckEnabled = true

	HumanVerificationProvider = HumanVerificationProviderNone
	assert.Equal(t, HumanVerificationProviderNone, GetHumanVerificationProvider())

	HumanVerificationProvider = HumanVerificationProviderTurnstile
	assert.Equal(t, HumanVerificationProviderTurnstile, GetHumanVerificationProvider())

	AliyunCaptchaEnabled = false
	HumanVerificationProvider = HumanVerificationProviderAliyun
	assert.Equal(t, HumanVerificationProviderAliyun, GetHumanVerificationProvider())

	HumanVerificationProvider = ""
	assert.Equal(t, HumanVerificationProviderTurnstile, GetHumanVerificationProvider())

	AliyunCaptchaEnabled = true
	assert.Equal(t, HumanVerificationProviderAliyun, GetHumanVerificationProvider())
}
