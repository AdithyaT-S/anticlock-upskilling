import { cn } from '@/lib/utils/cn'

interface StatusBadgeProps {
  status: string
  variant?: 'lead' | 'deal' | 'ticket'
}

const colorMap: Record<string, string> = {
  'New':          'bg-indigo-100 text-indigo-700',
  'Open':         'bg-indigo-100 text-indigo-700',
  'Contacted':    'bg-blue-100 text-blue-700',
  'In Progress':  'bg-blue-100 text-blue-700',
  'Pending':      'bg-blue-100 text-blue-700',
  'Waiting':      'bg-blue-100 text-blue-700',
  'Qualified':    'bg-green-100 text-green-700',
  'Proposal':     'bg-green-100 text-green-700',
  'Resolved':     'bg-green-100 text-green-700',
  'Negotiation':  'bg-amber-100 text-amber-700',
  'Closed Won':   'bg-emerald-100 text-emerald-700',
  'Won':          'bg-emerald-100 text-emerald-700',
  'Converted':    'bg-emerald-100 text-emerald-700',
  'Closed Lost':  'bg-red-100 text-red-700',
  'Lost':         'bg-red-100 text-red-700',
  'Closed':       'bg-red-100 text-red-700',
  'Unqualified':  'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = colorMap[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', colorClass)}>
      {status}
    </span>
  )
}
