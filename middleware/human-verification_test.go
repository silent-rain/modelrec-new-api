package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func TestHumanVerification(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalBaseURL := common.ModelHubBaseURL
	originalAliyunEnabled := common.AliyunCaptchaEnabled
	originalAliyunRegion := common.AliyunCaptchaRegion
	originalAliyunPrefix := common.AliyunCaptchaPrefix
	originalAliyunSceneID := common.AliyunCaptchaSceneID
	originalTurnstileEnabled := common.TurnstileCheckEnabled
	t.Cleanup(func() {
		common.ModelHubBaseURL = originalBaseURL
		common.AliyunCaptchaEnabled = originalAliyunEnabled
		common.AliyunCaptchaRegion = originalAliyunRegion
		common.AliyunCaptchaPrefix = originalAliyunPrefix
		common.AliyunCaptchaSceneID = originalAliyunSceneID
		common.TurnstileCheckEnabled = originalTurnstileEnabled
	})

	configureAliyun := func(baseURL string) {
		common.ModelHubBaseURL = baseURL
		common.AliyunCaptchaEnabled = true
		common.AliyunCaptchaRegion = "cn"
		common.AliyunCaptchaPrefix = "captcha-prefix"
		common.AliyunCaptchaSceneID = "scene-login"
		common.TurnstileCheckEnabled = true
	}

	newRouter := func() *gin.Engine {
		router := gin.New()
		store := cookie.NewStore([]byte("human-verification-test-secret"))
		router.Use(sessions.Sessions("session", store))
		router.GET("/protected", HumanVerificationCheck(), func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"success": true})
		})
		return router
	}

	t.Run("rejects a missing Aliyun captcha parameter", func(t *testing.T) {
		configureAliyun("http://127.0.0.1:1")
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "/protected", nil)

		newRouter().ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("unexpected status: %d", recorder.Code)
		}
		if !strings.Contains(recorder.Body.String(), "验证码参数为空") {
			t.Fatalf("unexpected response: %s", recorder.Body.String())
		}
	})

	t.Run("prefers Aliyun and reuses the verified session", func(t *testing.T) {
		var verificationCalls atomic.Int32
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			verificationCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":0,"message":"ok"}`))
		}))
		defer server.Close()
		configureAliyun(server.URL)

		router := newRouter()
		firstRecorder := httptest.NewRecorder()
		firstRequest := httptest.NewRequest(
			http.MethodGet,
			"/protected?captcha_verify_param=captcha-token",
			nil,
		)
		router.ServeHTTP(firstRecorder, firstRequest)

		if firstRecorder.Code != http.StatusOK || !strings.Contains(firstRecorder.Body.String(), `"success":true`) {
			t.Fatalf("unexpected first response: %d %s", firstRecorder.Code, firstRecorder.Body.String())
		}
		cookies := firstRecorder.Result().Cookies()
		if len(cookies) == 0 {
			t.Fatal("expected a verification session cookie")
		}

		secondRecorder := httptest.NewRecorder()
		secondRequest := httptest.NewRequest(http.MethodGet, "/protected", nil)
		for _, item := range cookies {
			secondRequest.AddCookie(item)
		}
		router.ServeHTTP(secondRecorder, secondRequest)

		if secondRecorder.Code != http.StatusOK || !strings.Contains(secondRecorder.Body.String(), `"success":true`) {
			t.Fatalf("unexpected cached response: %d %s", secondRecorder.Code, secondRecorder.Body.String())
		}
		if verificationCalls.Load() != 1 {
			t.Fatalf("expected one Rust verification call, got %d", verificationCalls.Load())
		}
	})

	t.Run("fails closed when Rust rejects the captcha", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":40001,"message":"验证码校验失败"}`))
		}))
		defer server.Close()
		configureAliyun(server.URL)

		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(
			http.MethodGet,
			"/protected?captcha_verify_param=invalid-token",
			nil,
		)
		newRouter().ServeHTTP(recorder, request)

		if !strings.Contains(recorder.Body.String(), "验证码校验失败") {
			t.Fatalf("unexpected response: %s", recorder.Body.String())
		}
	})
}
