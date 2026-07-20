package middleware

import "github.com/gin-gonic/gin"

// TurnstileCheck is kept for compatibility with extensions that still call the
// old middleware name. New routes should use HumanVerificationCheck.
func TurnstileCheck() gin.HandlerFunc {
	return HumanVerificationCheck()
}
