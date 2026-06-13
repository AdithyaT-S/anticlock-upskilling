'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Mail, Phone, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { updateLeadStatus, convertLeadToDeal, type LeadWithContact } from '@/lib/actions/leads'
import { DB_LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/lib/validations/lead'
import { getInitials, scoreColorClass } from '@/lib/utils/format'
import type { Activity } from '@/types/crm'

interface LeadDetailPanelProps {
  lead: LeadWithContact
  activities: Activity[]
  onClose: () => void
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'HIGH POTENTIAL'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}


export function LeadDetailPanel({ lead, activities, onClose }: LeadDetailPanelProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(lead.status)
  const [isConverted, setIsConverted] = useState(!!lead.converted_at)
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isConvertPending, startConvertTransition] = useTransition()

  const statusLabel = LEAD_STATUS_LABELS[currentStatus as keyof typeof LEAD_STATUS_LABELS] ?? currentStatus

  function handleStatusChange(newStatus: string) {
    startStatusTransition(async () => {
      const result = await updateLeadStatus(lead.id, { status: newStatus })
      if (result.error) {
        toast.error('message' in result.error ? result.error.message : 'Failed to update status')
        return
      }
      setCurrentStatus(newStatus)
      toast.success('Status updated')
    })
  }

  function handleConvert() {
    startConvertTransition(async () => {
      const result = await convertLeadToDeal(lead.id)
      if (result.error) {
        toast.error('message' in result.error ? result.error.message : 'Failed to convert lead')
        return
      }
      setIsConverted(true)
      toast.success('Lead converted — creating deal...')
      const params = new URLSearchParams()
      if (result.data?.contactId) params.set('contact_id', result.data.contactId)
      if (result.data?.source) params.set('source', result.data.source)
      router.push(`/deals/new?${params.toString()}`)
    })
  }

  const callActivities = activities.filter((a) => a.type === 'call')
  const emailActivities = activities.filter((a) => a.type === 'email')

  return (
    <div className="fixed inset-y-0 right-0 w-96 border-l bg-white shadow-xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b">
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium text-sm flex-shrink-0">
          {getInitials(lead.contact_first_name, lead.contact_last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 leading-tight truncate">
            {lead.contact_first_name} {lead.contact_last_name}
          </h2>
          {lead.contact_company && (
            <p className="text-sm text-gray-500 truncate">{lead.contact_company}</p>
          )}
          <div className="mt-1">
            <StatusBadge status={statusLabel} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Status + Convert */}
        <div className="p-4 space-y-3 border-b">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
            <Select
              value={currentStatus}
              onValueChange={handleStatusChange}
              disabled={isStatusPending || isConverted}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DB_LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isConverted || isConvertPending}
            onClick={handleConvert}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {isConverted ? 'Already Converted' : isConvertPending ? 'Converting...' : 'Convert to Deal'}
          </Button>
        </div>

        {/* Contact info */}
        <div className="p-4 space-y-2.5 border-b">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</h3>
          {lead.contact_email ? (
            <a
              href={`mailto:${lead.contact_email}`}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600"
            >
              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{lead.contact_email}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span>No email</span>
            </div>
          )}
          {lead.contact_phone ? (
            <a
              href={`tel:${lead.contact_phone}`}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600"
            >
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{lead.contact_phone}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>No phone</span>
            </div>
          )}
        </div>

        {/* Score */}
        <div className="p-4 border-b">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Score</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${scoreColorClass(lead.score)}`}>
              {lead.score}
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wide ${scoreColorClass(lead.score)}`}>
              {scoreLabel(lead.score)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Based on activity, budget, and authority</p>
          {lead.source && (
            <p className="text-xs text-gray-500 mt-2">Source: <span className="font-medium">{lead.source}</span></p>
          )}
          {lead.notes && (
            <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">{lead.notes}</p>
          )}
        </div>

        {/* Activity timeline */}
        <div className="p-4">
          <Tabs defaultValue="all">
            <TabsList className="mb-3">
              <TabsTrigger value="all">All ({activities.length})</TabsTrigger>
              <TabsTrigger value="calls">Calls ({callActivities.length})</TabsTrigger>
              <TabsTrigger value="emails">Emails ({emailActivities.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <ActivityTimeline activities={activities} />
            </TabsContent>
            <TabsContent value="calls">
              <ActivityTimeline activities={callActivities} />
            </TabsContent>
            <TabsContent value="emails">
              <ActivityTimeline activities={emailActivities} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
