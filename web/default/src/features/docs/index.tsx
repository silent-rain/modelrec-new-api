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
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Code2,
  FileCode2,
  HelpCircle,
  KeyRound,
  Layers,
  MessageSquareText,
  Rocket,
  Terminal,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'
import { cn } from '@/lib/utils'

// ============================================================================
// Sidebar Navigation Data
// ============================================================================

const SIDEBAR_SECTIONS = [
  {
    titleKey: 'docs.sidebar.quickStart',
    items: [
      { id: 'get-api-key', labelKey: 'docs.sidebar.getApiKey', icon: KeyRound },
      { id: 'create-api-key', labelKey: 'docs.sidebar.createApiKey', icon: FileCode2 },
      { id: 'start-using', labelKey: 'docs.sidebar.startUsing', icon: Rocket },
    ],
  },
  {
    titleKey: 'docs.sidebar.guide',
    items: [
      { id: 'first-conversation', labelKey: 'docs.sidebar.firstConversation', icon: MessageSquareText },
    ],
  },
  {
    titleKey: 'docs.sidebar.apiRef',
    items: [
      { id: 'api-reference', labelKey: 'docs.sidebar.apiReference', icon: Code2 },
    ],
  },
  // {
  //   titleKey: 'docs.sidebar.sdk',
  //   items: [
  //     { id: 'sdk-integration', labelKey: 'docs.sidebar.sdkIntegration', icon: Terminal },
  //   ],
  // },
  {
    titleKey: 'docs.sidebar.faq',
    items: [
      { id: 'faq-section', labelKey: 'docs.sidebar.faqSection', icon: HelpCircle },
    ],
  },
] as const

type SectionId = typeof SIDEBAR_SECTIONS[number]['items'][number]['id']

// ============================================================================
// Docs Page Component
// ============================================================================

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('get-api-key')

  const scrollToSection = (id: SectionId, scrollTarget?: string) => {
    setActiveSection(id)
    const el = document.getElementById(scrollTarget ?? id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // 滚动联动：根据当前视口位置自动高亮左侧菜单，
  // 解决点击顶部按钮 / 手动滚动时左侧菜单不同步的问题。
  useEffect(() => {
    const ids = SIDEBAR_SECTIONS.flatMap((s) => s.items.map((i) => i.id)) as SectionId[]
    const marker = 140 // 略高于 64px 固定顶栏 + 间距
    let ticking = false

    const update = () => {
      ticking = false
      let current: SectionId = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= marker) {
          current = id
        }
      }
      // 滚动到页面底部时，强制高亮最后一项
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1]
      }
      setActiveSection(current)
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <PublicLayout showMainContainer={false}>
      {/* Hero Section */}
      <DocsHero onJump={scrollToSection} />

      <div className='mx-auto max-w-7xl px-4 md:px-6 lg:px-8'>
        <div className='flex gap-8 pb-16 pt-4 lg:gap-12'>
          {/* Sidebar */}
          <DocsSidebar
            activeSection={activeSection}
            onNavigate={scrollToSection}
          />
          {/* Main Content */}
          <DocsContent />
        </div>
      </div>
    </PublicLayout>
  )
}

// ============================================================================
// Hero Section
// ============================================================================

function DocsHero({
  onJump,
}: {
  onJump: (id: SectionId, scrollTarget?: string) => void
}) {
  const { t } = useTranslation()

  return (
    <section className='relative overflow-hidden px-6 pt-12 pb-12 md:pt-20 md:pb-14'>
      <div aria-hidden className='pointer-events-none absolute inset-0 -z-10 sf-hero-glow' />
      <div className='mx-auto max-w-4xl text-center'>
        <AnimateInView animation='fade-up' delay={0}>
          <div className='mb-5 flex items-center justify-center gap-2.5'>
            <div className='bg-primary/10 flex size-11 items-center justify-center rounded-xl'>
              <BookOpen className='text-primary size-5' strokeWidth={1.5} />
            </div>
          </div>
          <h1 className='text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.15] font-bold tracking-tight'>
            燧元路由 开发文档
          </h1>
          <p className='mx-auto mt-4 max-w-xl text-base text-gray-500 md:text-lg dark:text-gray-400'>
            {t('docs.hero.subtitle')}
          </p>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={150}>
          <div className='mt-8 flex items-center justify-center gap-4'>
            <Button
              size='lg'
              className='h-11 rounded-lg px-7 text-sm font-medium sf-btn-primary'
              onClick={() => onJump('get-api-key', 'quick-start')}
            >
              <Rocket className='mr-2 size-4' />
              快速开始
            </Button>
            <Button
              variant='outline'
              size='lg'
              className='h-11 rounded-lg px-7 text-sm font-medium border-[#d1d5db] bg-white text-black hover:bg-white hover:border-[#9ca3af] dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-900 dark:hover:border-gray-400'
              onClick={() => onJump('api-reference')}
            >
              API 参考
              <ArrowRight className='ml-2 size-4' />
            </Button>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}

// ============================================================================
// Sidebar
// ============================================================================

function DocsSidebar({
  activeSection,
  onNavigate,
}: {
  activeSection: SectionId
  onNavigate: (id: SectionId) => void
}) {
  const { t } = useTranslation()

  return (
    <aside className='hidden w-56 shrink-0 lg:block'>
      <nav className='sticky top-24 space-y-6'>
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.titleKey}>
            <h3 className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70'>
              {t(section.titleKey)}
            </h3>
            <ul className='space-y-0.5'>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <li key={item.id}>
                    <button
                      type='button'
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className='size-3.5 shrink-0' />
                      {t(item.labelKey)}
                      <ChevronRight className={cn('ml-auto size-3 opacity-0 transition-opacity', isActive && 'opacity-100')} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

// ============================================================================
// Main Content
// ============================================================================

function DocsContent() {
  return (
    <div className='min-w-0 flex-1 space-y-14'>
      <QuickStartSection />
      <FirstConversationSection />
      <ApiReferenceSection />
      {/* <SdkIntegrationSection /> */}
      <FaqSection />
    </div>
  )
}

// ============================================================================
// Quick Start Section
// ============================================================================

function QuickStartSection() {
  const { t } = useTranslation()

  const steps = [
    {
      num: '1',
      titleKey: 'docs.quickStart.step1.title',
      descKey: 'docs.quickStart.step1.desc',
      id: 'get-api-key',
    },
    {
      num: '2',
      titleKey: 'docs.quickStart.step2.title',
      descKey: 'docs.quickStart.step2.desc',
      id: 'create-api-key',
    },
    {
      num: '3',
      titleKey: 'docs.quickStart.step3.title',
      descKey: 'docs.quickStart.step3.desc',
      id: 'start-using',
    },
  ] as const

  return (
    <section id='quick-start' className='scroll-mt-24'>
      <AnimateInView animation='fade-up'>
        <div className='mb-8 flex items-center gap-3'>
          <div className='bg-red-50 dark:bg-red-900/20 flex size-9 items-center justify-center rounded-lg'>
            <Rocket className='text-red-500 size-4' strokeWidth={1.5} />
          </div>
          <h2 className='text-2xl font-bold tracking-tight'>快速开始</h2>
        </div>
        <p className='mb-8 text-muted-foreground text-sm leading-relaxed'>
          {t('docs.quickStart.description')}
        </p>

        <div className='space-y-4'>
          {steps.map((step) => (
            <div
              key={step.id}
              id={step.id}
              className='flex items-start gap-4 rounded-xl border border-border/40 bg-background p-5 transition-colors scroll-mt-24 hover:border-border/60'
            >
              <div className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                step.num === '2' ? 'bg-primary' : 'sf-step-green'
              )}>
                {step.num}
              </div>
              <div className='pt-0.5'>
                <p className='font-semibold'>{t(step.titleKey)}</p>
                <p className='mt-1 text-muted-foreground text-sm leading-relaxed'>
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </AnimateInView>
    </section>
  )
}

// ============================================================================
// First Conversation Section
// ============================================================================

function FirstConversationSection() {
  const { t } = useTranslation()

  return (
    <section id='first-conversation' className='scroll-mt-24'>
      <AnimateInView animation='fade-up'>
        <div className='mb-8 flex items-center gap-3'>
          <div className='bg-blue-50 dark:bg-blue-900/20 flex size-9 items-center justify-center rounded-lg'>
            <MessageSquareText className='text-blue-500 size-4' strokeWidth={1.5} />
          </div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('docs.firstConversation.title')}</h2>
        </div>
        <p className='mb-6 text-muted-foreground text-sm leading-relaxed'>
          {t('docs.firstConversation.description')}
        </p>

        <div className='overflow-hidden rounded-lg border shadow-sm' style={{ backgroundColor: '#1a1f2c', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className='flex items-center gap-2 border-b px-4 py-2.5' style={{ backgroundColor: '#232937', borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className='rounded-md px-3 py-1 text-xs font-medium' style={{ backgroundColor: 'rgba(117,136,231,0)', color: '#6179eb' }}>
              OpenAI 兼容
            </span>
          </div>
          <pre className='overflow-x-auto p-5 text-sm leading-relaxed' style={{ backgroundColor: '#1a1f2c', color: '#dce3ef' }}>
            <code style={{ color: '#dce3ef' }}>
{`curl https://modelrec.net/v1/chat/completions \\
  -H "Authorization: Bearer sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'

# Response:
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}`}
            </code>
          </pre>
        </div>
      </AnimateInView>
    </section>
  )
}

// ============================================================================
// API Reference Section
// ============================================================================

function ApiReferenceSection() {
  const { t } = useTranslation()

  return (
    <section id='api-reference' className='scroll-mt-24'>
      <AnimateInView animation='fade-up'>
        <div className='mb-8 flex items-center gap-3'>
          <div className='bg-emerald-50 dark:bg-emerald-900/20 flex size-9 items-center justify-center rounded-lg'>
            <Code2 className='text-emerald-500 size-4' strokeWidth={1.5} />
          </div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('docs.apiRef.title')}</h2>
        </div>
        <p className='mb-6 text-muted-foreground text-sm leading-relaxed'>
          {t('docs.apiRef.description')}
        </p>

        {/* cURL Example */}
        <div className='mb-6 overflow-hidden rounded-lg border shadow-sm' style={{ backgroundColor: '#1a1f2c', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className='flex items-center gap-2 border-b px-4 py-2.5' style={{ backgroundColor: '#232937', borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className='rounded-md px-3 py-1 text-xs font-medium' style={{ backgroundColor: 'rgba(5,191,6,0)', color: 'rgb(0 188 114)' }}>
              cURL
            </span>
            <span className='text-xs' style={{ color: '#9aa5b8' }}>/v1/chat/completions</span>
          </div>
          <pre className='overflow-x-auto p-5 text-sm leading-relaxed' style={{ backgroundColor: '#1a1f2c', color: '#00bc72' }}>
            <code style={{ color: '#dce3ef' }}>
{`curl -X POST https://modelrec.net/v1/chat/completions \\
  -H "Authorization: Bearer sk-xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hi"}]}'`}
            </code>
          </pre>
        </div>

        {/* Python Example */}
        <div className='overflow-hidden rounded-lg border shadow-sm' style={{ backgroundColor: '#1a1f2c', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className='flex items-center gap-2 border-b px-4 py-2.5' style={{ backgroundColor: '#232937', borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className='rounded-md px-3 py-1 text-xs font-medium' style={{ backgroundColor: 'rgba(252,141,77,0)', color: '#ffa300' }}>
              Python
            </span>
            <span className='text-xs' style={{ color: '#9aa5b8' }}>/v1/chat/completions</span>
          </div>
          <pre className='overflow-x-auto p-5 text-sm leading-relaxed' style={{ backgroundColor: '#1a1f2c', color: '#dce3ef' }}>
            <code style={{ color: '#dce3ef' }}>
{`from openai import OpenAI

client = OpenAI(
    base_url="https://modelrec.net/v1",
    api_key="sk-xxx"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)`}
            </code>
          </pre>
        </div>
      </AnimateInView>
    </section>
  )
}

// ============================================================================
// SDK Integration Section
// ============================================================================

const SDK_ITEMS = [
  {
    name: 'Python',
    color: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    icon: '🐍',
    code: 'pip install openai',
    descKey: 'docs.sdk.pythonDesc',
  },
  {
    name: 'Node.js',
    color: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    icon: '🟢',
    code: 'npm install openai',
    descKey: 'docs.sdk.nodeDesc',
  },
  {
    name: 'Go',
    color: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    icon: '🔵',
    code: 'go get github.com/sashabaranov/go-openai',
    descKey: 'docs.sdk.goDesc',
  },
  {
    name: 'Java',
    color: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    icon: '☕',
    code: 'implementation \'com.theokanning.openai-gpt3-java:service\'',
    descKey: 'docs.sdk.javaDesc',
  },
]

function SdkIntegrationSection() {
  const { t } = useTranslation()

  return (
    <section id='sdk-integration'>
      <AnimateInView animation='fade-up'>
        <div className='mb-8 flex items-center gap-3'>
          <div className='bg-purple-50 dark:bg-purple-900/20 flex size-9 items-center justify-center rounded-lg'>
            <Layers className='text-purple-500 size-4' strokeWidth={1.5} />
          </div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('docs.sdk.title')}</h2>
        </div>
        <p className='mb-6 text-muted-foreground text-sm leading-relaxed'>
          {t('docs.sdk.description')}
        </p>

        <div className='grid gap-4 sm:grid-cols-2'>
          {SDK_ITEMS.map((sdk) => (
            <div
              key={sdk.name}
              className={cn(
                'group rounded-xl border border-border/40 bg-background p-5 transition-all hover:border-border/60 hover:shadow-sm'
              )}
            >
              <div className='mb-3 flex items-center gap-3'>
                <span className='text-2xl'>{sdk.icon}</span>
                <div>
                  <p className='font-semibold'>{sdk.name}</p>
                  <p className='text-muted-foreground text-xs'>{t(sdk.descKey)}</p>
                </div>
              </div>
              <code
                className='block overflow-x-auto rounded-lg px-3 py-2 text-xs'
                style={{ backgroundColor: '#1a1f2c', color: '#dce3ef' }}
              >
                {sdk.code}
              </code>
            </div>
          ))}
        </div>
      </AnimateInView>
    </section>
  )
}

// ============================================================================
// FAQ Section
// ============================================================================

const FAQS = [
  { q: 'docs.faq.q1.q', a: 'docs.faq.q1.a' },
  { q: 'docs.faq.q2.q', a: 'docs.faq.q2.a' },
  { q: 'docs.faq.q3.q', a: 'docs.faq.q3.a' },
  { q: 'docs.faq.q4.q', a: 'docs.faq.q4.a' },
]

function FaqSection() {
  const { t } = useTranslation()

  return (
    <section id='faq-section' className='scroll-mt-24'>
      <AnimateInView animation='fade-up'>
        <div className='mb-8 flex items-center gap-3'>
          <div className='bg-indigo-50 dark:bg-indigo-900/20 flex size-9 items-center justify-center rounded-lg'>
            <HelpCircle className='text-indigo-500 size-4' strokeWidth={1.5} />
          </div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('docs.faq.title')}</h2>
        </div>

        <div className='space-y-3'>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className='rounded-xl border border-border/40 bg-background p-5 transition-colors hover:border-border/60'
            >
              <p className='font-semibold'>{t(faq.q)}</p>
              <p className='mt-2 text-muted-foreground text-sm leading-relaxed'>
                {t(faq.a)}
              </p>
            </div>
          ))}
        </div>
      </AnimateInView>
    </section>
  )
}
