# Homepage P0 Design QA

Date: 2026-07-17

## Source and implementation evidence

- Prototype desktop hero: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-audit\01-prototype-home-hero.png`
- Prototype service matrix: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-audit\02-prototype-service-matrix.png`
- Prototype platform features and footer: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-audit\03-prototype-platform-features.png`
- Prototype mobile hero: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-audit\04-prototype-mobile-hero.png`
- Prototype mobile menu: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-audit\05-prototype-mobile-menu.png`
- Implementation desktop hero: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-p0-refinement\desktop-hero-final.png`
- Implementation desktop service matrix: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-p0-refinement\desktop-service-final.png`
- Implementation desktop platform features: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-p0-refinement\desktop-platform-final.png`
- Implementation desktop footer: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-p0-refinement\desktop-footer-final.png`
- Implementation mobile hero and menu: `C:\Users\doraemon\.codex\visualizations\2026\07\17\019f6daa-eca9-7fe2-b291-d53e5ef44736\homepage-p0-refinement\mobile-hero-final.png`, `mobile-menu-final.png`

## Coverage

- Desktop viewport: 1280 x 720, Chinese locale, unauthenticated state.
- Mobile viewport: 390 x 844, default and navigation-open states.
- Side-by-side visual comparison covers the header, hero, service matrix, platform features, footer, mobile hero, and mobile navigation.
- Runtime measurements confirmed hero height 608 px and the requested backgrounds: `#f7f5f9`, `#f9f7f2`, `#f7f7fd`, and footer `#111827`.
- Mobile navigation opens and closes, exposes the public links and auth actions, uses a white overlay with centered navigation, and has no horizontal overflow.
- The five capability icons changed vertical coordinates during a 420 ms sampling window, confirming the staggered reciprocating animation is active.
- Service and platform cards include compiled hover lift, border-highlight, and shadow states. Reduced-motion handling disables nonessential movement.
- Production build, targeted lint and formatting checks, and four navigation unit tests passed.
- Browser inspection found no application warning/error-level console entries and no horizontal overflow at either viewport.

## Comparison history

1. Replaced the shared public header on the default homepage with a prototype-specific header, matching navigation order, search placement, auth actions, and responsive menu behavior.
2. Corrected the hero height/background and added staggered floating animation to the five right-side capability icons.
3. Restored the `AI大模型服务矩阵` heading, supporting copy, model-market link, requested section color, and card hover feedback.
4. Corrected the platform section color and added the missing hover border highlight while retaining the lift animation.
5. Rebuilt the footer into the four-column prototype structure while retaining the project's required public attribution.
6. Final mobile inspection corrected the menu overlay to white and centered its links to match the source more closely.

## Accepted P0 constraints

- The prototype shows mock balance/avatar content. The implementation renders real account balance/profile controls only for authenticated users and register/sign-in controls for guests.
- The project-required `new-api` / QuantumNous attribution remains in the footer, adding a small amount of height compared with the prototype.
- The prototype-only comparison bar and backend-powered marketing data are outside this P0 slice.

## Final result

final result: passed
