export type QueueVisualMode = 'all' | 'ai' | 'human'

type QueueVisualTheme = {
  shell: string
  modeBadge: string
  heading: string
  subheading: string
  tabsRail: string
  tabActive: string
  tabInactive: string
  panel: string
  panelFrame: string
  accentBar: string
}

const QUEUE_VISUAL_THEMES: Record<QueueVisualMode, QueueVisualTheme> = {
  all: {
    shell: 'border-border/70 bg-gradient-to-br from-background/95 via-card/95 to-muted/70 shadow-[var(--shadow-md)]',
    modeBadge: 'bg-muted text-muted-foreground border-border/70',
    heading: 'text-foreground',
    subheading: 'text-muted-foreground',
    tabsRail: 'bg-card/80 border-border/60',
    tabActive: 'bg-primary-600 text-white border-primary-500 shadow-[0_16px_34px_-22px_rgba(18,166,106,0.9)]',
    tabInactive: 'text-muted-foreground hover:bg-background/70 hover:text-foreground border-transparent',
    panel: 'bg-card/85 border-border/70',
    panelFrame: 'border-border/60 bg-background/55',
    accentBar: 'from-primary-400/70 via-primary-300/40 to-transparent',
  },
  ai: {
    shell: 'border-emerald-300/80 bg-gradient-to-br from-emerald-100/88 via-teal-50/82 to-primary-100/75 dark:border-emerald-500/50 dark:from-emerald-950/45 dark:via-teal-950/35 dark:to-primary-950/35 shadow-[0_32px_70px_-45px_rgba(5,150,105,0.82)]',
    modeBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300/70 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-500/60',
    heading: 'text-emerald-900 dark:text-emerald-100',
    subheading: 'text-emerald-800/80 dark:text-emerald-200/80',
    tabsRail: 'bg-emerald-100/70 border-emerald-300/60 dark:bg-emerald-950/40 dark:border-emerald-500/50',
    tabActive: 'bg-emerald-600 text-white border-emerald-500 shadow-[0_16px_34px_-20px_rgba(5,150,105,0.95)]',
    tabInactive: 'text-emerald-900/80 dark:text-emerald-100/85 hover:bg-white/70 dark:hover:bg-emerald-900/50 border-transparent',
    panel: 'bg-white/78 border-emerald-300/65 dark:bg-emerald-950/22 dark:border-emerald-500/50',
    panelFrame: 'border-emerald-300/65 bg-white/40 dark:border-emerald-500/45 dark:bg-emerald-950/25',
    accentBar: 'from-emerald-500/80 via-teal-400/50 to-transparent',
  },
  human: {
    shell: 'border-violet-300/80 bg-gradient-to-br from-violet-100/86 via-fuchsia-50/82 to-indigo-100/78 dark:border-violet-500/50 dark:from-violet-950/42 dark:via-fuchsia-950/30 dark:to-indigo-950/35 shadow-[0_32px_70px_-45px_rgba(124,58,237,0.82)]',
    modeBadge: 'bg-violet-100 text-violet-900 border-violet-300/70 dark:bg-violet-900/40 dark:text-violet-100 dark:border-violet-500/60',
    heading: 'text-violet-900 dark:text-violet-100',
    subheading: 'text-violet-800/80 dark:text-violet-200/80',
    tabsRail: 'bg-violet-100/70 border-violet-300/60 dark:bg-violet-950/45 dark:border-violet-500/45',
    tabActive: 'bg-violet-600 text-white border-violet-500 shadow-[0_16px_34px_-20px_rgba(124,58,237,0.95)]',
    tabInactive: 'text-violet-900/80 dark:text-violet-100/85 hover:bg-white/70 dark:hover:bg-violet-900/45 border-transparent',
    panel: 'bg-white/80 border-violet-300/70 dark:bg-violet-950/22 dark:border-violet-500/45',
    panelFrame: 'border-violet-300/65 bg-white/40 dark:border-violet-500/45 dark:bg-violet-950/24',
    accentBar: 'from-violet-500/80 via-fuchsia-400/60 to-transparent',
  },
}

export function getQueueVisualTheme(mode: QueueVisualMode): QueueVisualTheme {
  return QUEUE_VISUAL_THEMES[mode]
}
