# Wallet Top-up Configuration Restoration Design

Date: 2026-07-17

## Context

The wallet page currently bypasses the payment configuration returned by
`GET /api/user/topup/info` when no configured gateway is available. A custom
fallback branch forces Alipay, fixed amount presets (`50`, `100`, `500`,
`1000`), a fixed currency symbol, and a fixed minimum amount of `10`.

The fallback was introduced after the upstream wallet implementation. It also
replaced the upstream "online top-up is not enabled" state with a live payment
button. The custom Alipay create endpoint therefore remains reachable from the
UI even when payment compliance has not been confirmed or the configured
payment methods do not include Alipay.

The backend already exposes the authoritative payment state:

- gateway availability flags such as `enable_online_topup`;
- configured `pay_methods`;
- global and method-specific minimum top-up amounts;
- configured amount presets and discounts;
- `payment_compliance_confirmed`.

The custom Rust Alipay endpoint is outside this restoration slice. It already
reads `MinTopUp`, but server-side protection against direct calls that bypass
the frontend remains a separate security-hardening task.

## Upstream Comparison

The current `QuantumNous/new-api` implementation is the reference for business
boundaries:

- it renders only backend-provided amount presets and payment methods;
- it derives the custom-input minimum from `getMinTopupAmount(topupInfo)`;
- it shows an unavailable alert when no top-up gateway is enabled;
- it does not inject Alipay or provide a hard-coded payment fallback;
- payment confirmation dispatches the selected configured payment method.

This project must preserve its direct Rust Alipay integration, so the solution
will restore the upstream configuration boundary without reverting the custom
Alipay implementation itself.

Upstream references:

- <https://github.com/QuantumNous/new-api/blob/main/web/default/src/features/wallet/components/recharge-form-card.tsx>
- <https://github.com/QuantumNous/new-api/blob/main/web/default/src/features/wallet/index.tsx>
- <https://github.com/QuantumNous/new-api/blob/main/controller/topup.go>

## Goals

1. Make backend configuration the single source of truth for payment
   availability, methods, amount presets, discounts, and minimum amounts.
2. Preserve direct Alipay payment when, and only when, Alipay is configured and
   payment compliance is confirmed.
3. Keep the existing wallet visual language where it does not conflict with the
   configuration-driven behavior.

## Non-goals

- Payment return handling, polling, and wallet status refresh.
- Alipay callback amount comparison and callback response formatting.
- Redesigning the system-settings payment editor.
- Adding a new standalone `DirectAlipayEnabled` option in this slice.
- Modifying `model-hub-rs` or adding server-side guards to its direct Alipay
  endpoint.

## Authoritative Availability Rules

The wallet derives visible payment methods from `topupInfo`:

- If payment compliance is not confirmed, the backend returns no configured
  payment methods and all gateway availability flags are false. The wallet
  shows the unavailable state.
- Epay-backed methods are visible only when `enable_online_topup` is true.
- Direct Alipay is visible only when `pay_methods` contains `type: "alipay"`.
  This preserves the existing admin-configured method as the Alipay switch.
- Stripe, Creem, Waffo, and Waffo Pancake continue to use their existing
  backend availability flags.
- The frontend never inserts a missing payment method.

## Frontend Design

### Recharge form

Remove the simplified fallback branch, its local custom-amount state, forced
Alipay method, fixed presets, fixed minimum, fixed currency symbol, and
`onPayNow` shortcut.

Use the upstream-style configured branch as the only standard top-up UI:

- render `presetAmounts` produced by `useTopupInfo`;
- use `getMinTopupAmount(topupInfo)` for the input minimum and placeholder;
- render only currently available configured methods;
- keep each method's `min_topup` disabling behavior;
- show the existing unavailable alert if no method or gateway is available.

### Payment dispatch

Keep the existing selected-method confirmation flow. When the selected method
has type `alipay`, dispatch to the Rust direct Alipay create endpoint. Other
methods retain the existing upstream dispatch behavior.

Remove the separate `handlePayNow` path so every payment starts with a method
selected from backend-provided configuration.

### Initial amount

Restore the initial amount and selected preset to an unselected state. Once
`topupInfo` loads, initialize the amount from the dynamic minimum and calculate
the payable amount using the current default configured method.

## Backend Boundary

The existing Go `GetTopUpInfo` implementation already matches the upstream
configuration contract and requires no production change in this slice. It
continues to suppress payment methods and gateway flags when compliance is not
confirmed, and to expose `MinTopUp`, configured presets, discounts, and payment
methods when enabled.

The direct Rust Alipay endpoint remains unchanged. Preventing a caller from
invoking that endpoint directly while frontend payment is disabled is an
explicit follow-up security task.

## Error Handling

- Frontend fetch failure retains the existing loading/error behavior and must
  not reveal the hard-coded fallback.

## Test Strategy

Implementation follows test-driven development.

Frontend regression coverage will verify:

- no payment UI is rendered when all methods are disabled;
- Alipay is not injected when absent from `pay_methods`;
- configured presets and `MinTopUp` drive the rendered controls;
- method-specific minimums disable only the affected method;
- configured Alipay still dispatches through the direct Alipay handler.

Automated tests will cover disabled compliance, Alipay removed, direct Alipay
with a changed global minimum and presets, and method-specific minimums.
Browser verification will exercise the current payment-disabled wallet state
without mutating compliance or real gateway settings.

## Rollout Boundary

This slice restores configuration authority only. Payment return/status refresh
and webhook correctness remain follow-up work and must be verified separately
after this foundation is in place.
