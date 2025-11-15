import type { TagStatus } from '../../shared/analysis-types'

interface StatusConfig {
  label: string
  badge: string
  accent: string
  subtle: string
}

const STATUS_MAP: Record<TagStatus, StatusConfig> = {
  ok: {
    label: 'Excellent',
    badge: 'bg-success text-success-foreground',
    accent: 'text-success',
    subtle: 'bg-success/10'
  },
  warning: {
    label: 'Needs attention',
    badge: 'bg-warning text-warning-foreground',
    accent: 'text-warning',
    subtle: 'bg-warning/10'
  },
  error: {
    label: 'Critical',
    badge: 'bg-danger text-danger-foreground',
    accent: 'text-danger',
    subtle: 'bg-danger/10'
  }
}

export function getStatusConfig(status: TagStatus): StatusConfig {
  return STATUS_MAP[status]
}

