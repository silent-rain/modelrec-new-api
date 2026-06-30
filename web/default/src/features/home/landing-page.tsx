/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronDown,
  Code,
  DollarSign,
  Monitor,
  Activity,
  CircleDot,
  Globe,
  MessageCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ============================================================================
// Landing Page - New static home page matching reference design
// ============================================================================

export function LandingPage() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user

  return (
    <PublicLayout showMainContainer={false}>
      <HeroSection isAuthenticated={isAuthenticated} />
      <FeatureCards />
      <QuickStartSection />
      <FAQSection />
      <LandingFooter />
    </PublicLayout>
  )
}

// ============================================================================
// Hero Section
// ============================================================================

function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation()

  return (
    <section className='relative overflow-hidden px-6 pt-28 pb-16 md:pt-36 md:pb-24'>
      {/* Background gradient - soft lavender glow */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 sf-hero-glow'
      />

      <div className='mx-auto max-w-4xl text-center'>
        <AnimateInView animation='fade-up' delay={0}>
          <h1 className='text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.15] font-bold tracking-tight hero-title-gradient'>
            {t('AI Model Recommendation')}
          </h1>
          <p className='mt-4 text-base text-gray-800 md:text-lg dark:text-gray-200'>
            {t('Better quality, better understanding')}
          </p>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={150}>
          <div className='mt-8 flex items-center justify-center gap-4'>
            {isAuthenticated ? (
              <Button
                size='lg'
                className='h-12 rounded-full px-8 text-sm font-medium sf-btn-primary'
                render={<Link to='/dashboard' />}
              >
                {t('Go to Dashboard')}
                <ArrowRight className='ml-2 size-4' />
              </Button>
            ) : (
              <>
                <Button
                  size='lg'
                  className='h-12 rounded-full px-8 text-sm font-medium sf-btn-primary'
                  render={<Link to='/sign-up' />}
                >
                  {t('Get API Key')}
                </Button>
                <Button
                  variant='outline'
                  size='lg'
                  className='h-12 rounded-full px-8 text-sm font-medium sf-btn-outline'
                  render={<Link to='/pricing' />}
                >
                  {t('Configure Market')}
                </Button>
              </>
            )}
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}

// ============================================================================
// Feature Cards
// ============================================================================

const FEATURES = [
  {
    icon: CircleDot,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    titleKey: 'feature.anyModelApi.title',
    descKey: 'feature.anyModelApi.desc',
  },
  {
    icon: DollarSign,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    titleKey: 'feature.billingRateLimit.title',
    descKey: 'feature.billingRateLimit.desc',
  },
  {
    icon: Activity,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    titleKey: 'feature.performanceMonitor.title',
    descKey: 'feature.performanceMonitor.desc',
  },
  {
    icon: Code,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    titleKey: 'feature.developerSdk.title',
    descKey: 'feature.developerSdk.desc',
  },
] as const

function FeatureCards() {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 px-6 py-16 md:py-24'>
      <div className='mx-auto grid max-w-5xl gap-6 md:grid-cols-4'>
        {FEATURES.map((f, i) => {
          const Icon = f.icon
          return (
            <AnimateInView key={f.titleKey} delay={i * 100} animation='scale-in'>
              <div className='group border-border/40 bg-background flex flex-col items-center rounded-2xl border p-7 text-center transition-all duration-300 hover:border-violet-500/25 hover:bg-muted/20 hover:shadow-md'>
                <div
                  className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${f.bgColor}`}
                >
                  <Icon className={`size-6 ${f.color}`} strokeWidth={1.5} />
                </div>
                <h3 className='mb-2 text-sm font-semibold'>
                  {t(f.titleKey)}
                </h3>
                <p className='text-muted-foreground leading-relaxed text-xs'>
                  {t(f.descKey)}
                </p>
              </div>
            </AnimateInView>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================================
// Quick Start Section (3-minute setup)
// ============================================================================

const SETUP_STEPS = [
  {
    num: '1',
    numBg: 'bg-violet-500',
    titleKey: 'setup.step1.title',
    descKey: 'setup.step1.desc',
  },
  {
    num: '2',
    numBg: 'bg-violet-500',
    titleKey: 'setup.step2.title',
    descKey: 'setup.step2.desc',
  },
  {
    num: '3',
    numBg: 'bg-violet-500',
    titleKey: 'setup.step3.title',
    descKey: 'setup.step3.desc',
  },
] as const

function QuickStartSection() {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 border-border/40 bg-muted/20 border-t px-6 py-16 md:py-24'>
      <div className='mx-auto max-w-5xl'>
        <div className='grid gap-12 lg:grid-cols-[45fr_55fr] lg:gap-16'>
          {/* Left: Steps */}
          <div className='flex flex-col justify-center'>
            <AnimateInView animation='fade-right' delay={0}>
              <h2 className='mb-10 text-2xl font-bold tracking-tight md:text-3xl'>
                {t('setup.title')}
              </h2>

              <div className='space-y-6'>
                {SETUP_STEPS.map((step) => (
                  <div
                    key={step.num}
                    className='flex items-start gap-4'
                  >
                    <div
                      className={`flex shrink-0 size-9 items-center justify-center rounded-full ${step.numBg} text-white text-sm font-bold`}
                    >
                      {step.num}
                    </div>
                    <div className='pt-0.5'>
                      <p className='text-sm font-semibold'>
                        {t(step.titleKey)}
                      </p>
                      <p className='mt-1 text-muted-foreground text-xs leading-relaxed'>
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className='mt-8'>
                <Button
                  size='lg'
                  className='rounded-full px-8 sf-btn-primary'
                  render={<Link to='/sign-up' />}
                >
                  {t('Get Started')}
                  <ArrowRight className='ml-2 size-4' />
                </Button>
              </div>
            </AnimateInView>
          </div>

          {/* Right: Mock App Preview */}
          <div className='flex items-center justify-center'>
            <AnimateInView animation='fade-left' delay={200} className='w-full flex justify-center'>
              <MockAppPreview />
            </AnimateInView>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Mock App Preview (right side of Quick Start section)
// ============================================================================

function MockAppPreview() {
  const { t } = useTranslation()

  return (
    <div className='relative w-full' style={{ maxWidth: '440px', width: '100%' }}>
      {/* Phone frame */}
      <div className='overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900'>
        {/* Phone status bar */}
        <div className='flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2 dark:border-gray-800 dark:bg-gray-800/50'>
          <span className='text-xs font-medium'>9:41</span>
          <div className='flex items-center gap-1'>
            <span className='text-xs'>燧元路由</span>
          </div>
          <div className='flex items-center gap-1'>
            <div className='size-3 rounded-sm border border-gray-400 dark:border-gray-500' />
          </div>
        </div>

        {/* App content */}
        <div className='space-y-4 p-4'>
          {/* Model cards row */}
          <div className='grid grid-cols-2 gap-2'>
            {[
              { label: 'Chat', emoji: '🎯', bg: 'bg-pink-100 dark:bg-pink-900/30' },
              { label: 'Image', emoji: '💖', bg: 'bg-red-100 dark:bg-red-900/30' },
              { label: 'Code', emoji: '📝', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { label: 'More', emoji: '📊', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
            ].map((card) => (
              <div
                key={card.label}
                className={`flex flex-col items-center justify-center rounded-xl py-4 ${card.bg}`}
              >
                <span className='text-xl'>{card.emoji}</span>
                <span className='mt-1 text-xs font-medium text-gray-600 dark:text-gray-400'>
                  {card.label}
                </span>
              </div>
            ))}
          </div>

          {/* API Key input area */}
          <div className='rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700'>
            <p className='mb-2 text-xs font-medium text-gray-500 dark:text-gray-400'>
              API Key
            </p>
            <div className='rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400'>
              sk-xxxxxxxxxxxxx...
            </div>
          </div>

          {/* Model list */}
          <div className='space-y-2'>
            {[
              { name: 'GPT-4o', tag: 'OpenAI' },
              { name: 'Claude 3.5', tag: 'Anthropic' },
              { name: 'Gemini Pro', tag: 'Google' },
            ].map((model) => (
              <div
                key={model.name}
                className='flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800'
              >
                <div className='flex items-center gap-2'>
                  <div className='flex size-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
                    <CircleDot className='size-3 text-emerald-600 dark:text-emerald-400' />
                  </div>
                  <span className='text-xs font-medium'>{model.name}</span>
                </div>
                <span className='text-[10px] text-gray-400 dark:text-gray-500'>
                  {model.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative shadow/glow behind phone */}
      <div
        aria-hidden
        className='-z-10 absolute inset-0 -m-4 rounded-[2.5rem] bg-gradient-to-br from-violet-200/40 via-purple-200/30 to-transparent blur-2xl dark:from-violet-900/20 dark:via-purple-900/10'
      />
    </div>
  )
}

// ============================================================================
// FAQ Section
// ============================================================================

const FAQ_ITEMS = [
  {
    q: 'faq.q1.question',
    a: 'faq.q1.answer',
  },
  {
    q: 'faq.q2.question',
    a: 'faq.q2.answer',
  },
  {
    q: 'faq.q3.question',
    a: 'faq.q3.answer',
  },
  {
    q: 'faq.q4.question',
    a: 'faq.q4.answer',
  },
  {
    q: 'faq.q5.question',
    a: 'faq.q5.answer',
  },
] as const

function FAQSection() {
  const { t } = useTranslation()
  const [openItem, setOpenItem] = useState<string | null>(null)

  return (
    <section className='relative z-10 px-6 py-16 md:py-24'>
      <div className='mx-auto max-w-3xl'>
        <AnimateInView animation='fade-up' className='mb-10 text-center'>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('faq.title')}
          </h2>
        </AnimateInView>

        <div className='space-y-3'>
          {FAQ_ITEMS.map((item, i) => (
            <AnimateInView key={item.q} delay={i * 80} animation='fade-up'>
              <Collapsible
                open={openItem === item.q}
                onOpenChange={(open) =>
                  setOpenItem(open ? item.q : null)
                }
              >
                <div className='border-border/40 overflow-hidden rounded-xl border bg-background transition-colors hover:border-border/60'>
                  <CollapsibleTrigger className='flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium transition-colors hover:bg-muted/30'>
                    <span>Q: {t(item.q)}</span>
                    <ChevronDown
                      className={`text-muted-foreground size-4 shrink-0 transition-transform duration-200 ${
                        openItem === item.q ? 'rotate-180' : ''
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className='border-t border-border/30 px-6 pb-5 pt-4 text-muted-foreground text-sm leading-relaxed'>
                      {t(item.a)}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Landing Footer
// ============================================================================

const FOOTER_PRODUCT_LINKS = [
  { labelKey: 'footer.product.pricing', href: '/pricing' },
  { labelKey: 'footer.product.compare', href: '/model' },
  { labelKey: 'footer.product.plans', href: '/pricing' },
  { labelKey: 'footer.product.payment', href: '/top-up' },
] as const

const FOOTER_DEVELOPER_LINKS = [
  { labelKey: 'footer.developer.apiDocs', href: '/dashboard' },
  { labelKey: 'footer.developer.sdk', href: '#' },
  { labelKey: 'footer.developer.github', href: '#' },
  { labelKey: 'footer.developer.forum', href: '#' },
] as const

function LandingFooter() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className='border-border/40 relative z-10 border-t bg-muted/20'>
      <div className='mx-auto max-w-6xl px-6 py-12 md:py-16'>
        <div className='flex flex-col justify-between gap-10 md:flex-row md:gap-16'>
          {/* Brand column */}
          <div className='shrink-0 max-w-[240px]'>
            <Link to='/' className='group flex items-center gap-2.5'>
              <div className='bg-violet-500/10 flex size-8 items-center justify-center rounded-lg text-sm font-bold text-violet-600'>
                M
              </div>
              <span className='text-base font-semibold tracking-tight'>
                燧元路由
              </span>
            </Link>
            <p className='text-muted-foreground mt-2 mb-1 text-xs font-medium'>
              {t('footer.brand.tagline')}
            </p>
            <p className='text-muted-foreground/60 text-xs leading-relaxed'>
              {t('footer.brand.description')}
            </p>
          </div>

          {/* Product column */}
          <div>
            <h4 className='mb-3 text-xs font-semibold tracking-wider'>
              {t('footer.columns.product')}
            </h4>
            <ul className='space-y-2.5'>
              {FOOTER_PRODUCT_LINKS.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    to={link.href}
                    className='text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm'
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Developer column */}
          <div>
            <h4 className='mb-3 text-xs font-semibold tracking-wider'>
              {t('footer.columns.developer')}
            </h4>
            <ul className='space-y-2.5'>
              {FOOTER_DEVELOPER_LINKS.map((link) => (
                <li key={link.labelKey}>
                  {link.href.startsWith('http') || link.href === '#' ? (
                    <a
                      href={link.href}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm'
                    >
                      {t(link.labelKey)}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className='text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm'
                    >
                      {t(link.labelKey)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Follow us column */}
          <div>
            <h4 className='mb-3 text-xs font-semibold tracking-wider'>
              {t('footer.columns.followUs')}
            </h4>
            <div className='flex gap-3'>
              <a
                href='#'
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:bg-muted flex size-9 items-center justify-center rounded-lg border border-border/50 transition-all hover:text-foreground'
                aria-label='GitHub'
              >
                <svg viewBox='0 0 24 24' className='size-4 fill-current'><path d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z'/></svg>
              </a>
              <a
                href='#'
                target='_blank'
                rel='noopener noreferrer'
                className='text-muted-foreground hover:bg-muted flex size-9 items-center justify-center rounded-lg border border-border/50 transition-all hover:text-foreground'
                aria-label='Twitter / X'
              >
                <MessageCircle className='size-4' />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div className='border-border/30 mt-10 flex items-center justify-between border-t pt-6 text-xs text-muted-foreground/40'>
          <span>&copy; {currentYear} 燧元路由. {t('footer.copyright')}</span>
        </div>
      </div>
    </footer>
  )
}
