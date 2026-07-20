# Wallet Top-up Configuration Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not dispatch subagents for this workspace.

**Goal:** Restore the QuantumNous/new-api configuration-driven wallet boundary while preserving this fork's configured direct Alipay dispatch.

**Architecture:** Keep `GET /api/user/topup/info` as the source of truth. Add a pure payment-availability selector in the wallet library, then make the wallet component render only methods and amounts derived from that response; the selected `alipay` method continues to dispatch through the existing direct Alipay hook.

**Tech Stack:** React 19, TypeScript, Bun test, Rsbuild, existing Go configuration API.

## Global Constraints

- Modify only `modelrec-new-api`; do not modify `model-hub-rs` in this slice.
- Preserve direct Alipay, but expose it only when `pay_methods` contains `type: "alipay"` and compliance is not disabled.
- Do not add dependencies or change return, polling, webhook, or callback behavior.
- Do not mutate payment compliance or real gateway settings during browser QA.
- Preserve unrelated working-tree changes and stage only files from this plan.

---

### Task 1: Make payment availability and minimum amounts configuration-driven

**Files:**
- Create: `web/default/tests/wallet-topup-config.test.ts`
- Modify: `web/default/src/features/wallet/lib/payment.ts`

**Interfaces:**
- Consumes: `TopupInfo`, `PaymentMethod`, and `PAYMENT_TYPES`.
- Produces: `getAvailablePaymentMethods(topupInfo: TopupInfo | null): PaymentMethod[]`; updated default-method and minimum-amount selection.

- [ ] **Step 1: Write failing behavior tests**

```ts
import { describe, expect, test } from 'bun:test'
import * as payment from '../src/features/wallet/lib/payment'
import type { PaymentMethod, TopupInfo } from '../src/features/wallet/types'

const buildTopupInfo = (overrides: Partial<TopupInfo> = {}): TopupInfo => ({
  enable_online_topup: false,
  enable_stripe_topup: false,
  pay_methods: [],
  min_topup: 25,
  stripe_min_topup: 10,
  amount_options: [25, 50],
  discount: {},
  payment_compliance_confirmed: true,
  ...overrides,
})

const configuredMethods: PaymentMethod[] = [
  { name: 'WeChat', type: 'wxpay' },
  { name: 'Alipay', type: 'alipay' },
]

describe('wallet top-up configuration', () => {
  test('fails closed when payment compliance is disabled', () => {
    const selector = Reflect.get(payment, 'getAvailablePaymentMethods')
    expect(selector).toBeFunction()
    if (typeof selector !== 'function') return
    const disabledInfo = buildTopupInfo({
      pay_methods: configuredMethods,
      payment_compliance_confirmed: false,
    })
    expect(selector(disabledInfo)).toEqual([])
    expect(payment.getDefaultPaymentType(disabledInfo)).toBe('')
  })

  test('keeps direct Alipay without exposing disabled Epay methods', () => {
    const selector = Reflect.get(payment, 'getAvailablePaymentMethods')
    expect(selector).toBeFunction()
    if (typeof selector !== 'function') return
    expect(selector(buildTopupInfo({ pay_methods: configuredMethods })).map(
      (method: PaymentMethod) => method.type
    )).toEqual(['alipay'])
  })

  test('uses the configured global minimum for direct Alipay', () => {
    expect(payment.getMinTopupAmount(
      buildTopupInfo({ pay_methods: configuredMethods })
    )).toBe(25)
  })

  test('chooses an available configured method as the default', () => {
    expect(payment.getDefaultPaymentType(
      buildTopupInfo({ pay_methods: configuredMethods })
    )).toBe('alipay')
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `web/default`:

```powershell
bun test tests/wallet-topup-config.test.ts
```

Expected: assertion failures show the selector is missing, the default minimum is used, and disabled `wxpay` is selected first.

- [ ] **Step 3: Implement the minimal selector**

Add to `payment.ts` and use it from the two existing selectors:

```ts
export function getAvailablePaymentMethods(
  topupInfo: TopupInfo | null
): PaymentMethod[] {
  if (!topupInfo || topupInfo.payment_compliance_confirmed === false) return []

  return (topupInfo.pay_methods ?? []).filter((method) => {
    switch (method.type) {
      case PAYMENT_TYPES.ALIPAY:
        return true
      case PAYMENT_TYPES.STRIPE:
        return topupInfo.enable_stripe_topup
      case PAYMENT_TYPES.WAFFO_PANCAKE:
        return topupInfo.enable_waffo_pancake_topup === true
      case PAYMENT_TYPES.WAFFO:
        return false
      default:
        return topupInfo.enable_online_topup
    }
  })
}
```

Import `PaymentMethod`. `getDefaultPaymentType` chooses the first available
method before Waffo fallbacks and returns an empty string when no payment method
is enabled. `getMinTopupAmount` returns `min_topup` when Epay is enabled or an
available Alipay method exists, retaining existing Stripe/Waffo fallbacks.

- [ ] **Step 4: Run the focused test and verify GREEN**

```powershell
bun test tests/wallet-topup-config.test.ts
```

Expected: 4 pass, 0 fail.

- [ ] **Step 5: Commit the library behavior**

```powershell
git add -- web/default/tests/wallet-topup-config.test.ts web/default/src/features/wallet/lib/payment.ts
git commit -m "fix(wallet): derive payment availability from config"
```

---

### Task 2: Restore the upstream wallet rendering boundary

**Files:**
- Modify: `web/default/tests/wallet-topup-config.test.ts`
- Modify: `web/default/src/features/wallet/components/recharge-form-card.tsx`
- Modify: `web/default/src/features/wallet/index.tsx`

**Interfaces:**
- Consumes: `getAvailablePaymentMethods`, dynamic `presetAmounts`, and the existing selected-method Alipay branch.
- Produces: one configuration-driven recharge UI with no `onPayNow` fallback.

- [ ] **Step 1: Add a failing source contract test**

```ts
const readWalletSource = (path: string) =>
  Bun.file(new URL(`../src/features/wallet/${path}`, import.meta.url)).text()

describe('wallet top-up source boundary', () => {
  test('does not contain the hard-coded Alipay fallback', async () => {
    const [formSource, walletSource] = await Promise.all([
      readWalletSource('components/recharge-form-card.tsx'),
      readWalletSource('index.tsx'),
    ])

    expect(formSource).toContain(
      'const paymentMethods = getAvailablePaymentMethods(topupInfo)'
    )
    expect(formSource).not.toContain('Ensure Alipay is always available')
    expect(formSource).not.toContain('simplePaymentMethod')
    expect(formSource).not.toContain('{ value: 50, label:')
    expect(formSource).not.toContain('onPayNow?:')
    expect(walletSource).not.toContain('handlePayNow')
  })

  test('restores the unavailable and compliance states', async () => {
    const formSource = await readWalletSource(
      'components/recharge-form-card.tsx'
    )
    expect(formSource).not.toContain('// <Alert>')
    expect(formSource).toContain(
      'Online topup is not enabled. Please use redemption code or contact administrator.'
    )
    expect(formSource).toContain(
      'Redemption codes are disabled until the administrator confirms compliance terms.'
    )
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
bun test tests/wallet-topup-config.test.ts
```

Expected: four library tests pass and two source-boundary tests fail on the forced fallback and commented alerts.

- [ ] **Step 3: Restore `RechargeFormCard`**

Use the configuration selector as the only standard-method source:

```ts
const paymentMethods = getAvailablePaymentMethods(topupInfo)
const hasConfigurableTopup =
  paymentMethods.length > 0 || enableWaffoTopup || enableWaffoPancakeTopup
const hasAnyTopup = hasConfigurableTopup || enableCreemTopup
```

- Remove `useRef`, `Pencil`, `PAYMENT_TYPES`, local fallback state/handlers, and the `onPayNow`/`payNowLoading` props.
- Keep the existing dynamic preset grid and custom amount input.
- Disable a method below `Math.max(minTopup, method.min_topup || 0)`.
- Replace the no-top-up branch with the upstream `Alert`.
- Restore the redemption-disabled `Alert` and generic description.

- [ ] **Step 4: Restore `Wallet` initialization and dispatch boundary**

```ts
const [topupAmount, setTopupAmount] = useState(0)
const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
```

- Delete `handlePayNow` and stop passing its props.
- Keep the existing configured `PAYMENT_TYPES.ALIPAY` branch in
  `handlePaymentConfirm`.
- In the top-up initialization effect, call `calculatePaymentAmount` only when
  `getDefaultPaymentType(topupInfo)` returns a non-empty configured type.
- Validate selection against
  `Math.max(getMinTopupAmount(topupInfo), method.min_topup || 0)`.

- [ ] **Step 5: Run focused and full checks**

```powershell
bun test tests/wallet-topup-config.test.ts
bun test
bun run typecheck
```

Expected: 6 focused tests pass, all Bun tests pass, and TypeScript exits 0.

- [ ] **Step 6: Commit the UI restoration**

```powershell
git add -- web/default/tests/wallet-topup-config.test.ts web/default/src/features/wallet/components/recharge-form-card.tsx web/default/src/features/wallet/index.tsx
git commit -m "fix(wallet): restore configured topup boundary"
```

---

### Task 3: Verify rendered behavior and production build

**Files:**
- Verify only; no production file changes expected.

**Interfaces:**
- Consumes: `http://127.0.0.1:5173` and current payment-disabled backend state.
- Produces: build and browser evidence that the fallback is gone.

- [ ] **Step 1: Run full verification**

```powershell
bun test
bun run build:check
git diff --check HEAD~2..HEAD
```

Expected: tests and build exit 0; diff check emits no whitespace errors.

- [ ] **Step 2: Verify in the Browser plugin**

Flow: `/wallet` -> backend reports payment disabled -> wallet renders the
unavailable alert without amount cards, Alipay, or `Pay Now`. Check page
identity, meaningful DOM, framework overlay, console health, and open order
history as interaction proof. Capture a screenshot. Do not change settings.

- [ ] **Step 3: Review scope**

```powershell
git status --short
git diff HEAD~2 -- web/default/src/features/wallet web/default/tests/wallet-topup-config.test.ts docs/plans/2026-07-17-wallet-topup-config-design.md docs/superpowers/plans/2026-07-17-wallet-topup-config-restoration.md
```

Expected: planned wallet/tests/docs only; unrelated changes remain untouched.
