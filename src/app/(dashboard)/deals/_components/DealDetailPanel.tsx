'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil, Trash2, Trophy, XCircle, Calendar, DollarSign, User, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { closeDeal, deleteDeal } from '@/lib/actions/deals'
import type { DealDetail } from '@/lib/actions/deals'

interface DealDetailPanelProps {
  deal: DealDetail
  isAdmin: boolean
  onClose: () => void
}


export function DealDetailPanel({ deal, isAdmin, onClose }: DealDetailPanelProps) {
  const router = useRouter()
  const [showLostForm, setShowLostForm]     = useState(false)
  const [lostReason, setLostReason]         = useState('')
  const [lostReasonError, setLostReasonError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [, startTransition] = useTransition()
  const [isClosingWon,  setIsClosingWon]  = useState(false)
  const [isClosingLost, setIsClosingLost] = useState(false)
  const [isDeleting,    setIsDeleting]    = useState(false)

  const contactName = deal.contact_first_name
    ? `${deal.contact_first_name} ${deal.contact_last_name ?? ''}`.trim()
    : null

  async function handleCloseWon() {
    setIsClosingWon(true)
    const result = await closeDeal({ deal_id: deal.id, status: 'won' })
    setIsClosingWon(false)
    if (result.error) {
      toast.error('message' in result.error ? result.error.message : 'Failed to close deal')
      return
    }
    toast.success('Deal closed as Won 🎉')
    onClose()
  }

  async function handleCloseLost() {
    setLostReasonError('')
    if (!lostReason.trim()) {
      setLostReasonError('Please provide a reason for losing this deal.')
      return
    }
    setIsClosingLost(true)
    const result = await closeDeal({ deal_id: deal.id, status: 'lost', lost_reason: lostReason.trim() })
    setIsClosingLost(false)
    if (result.error) {
      if ('fieldErrors' in result.error && result.error.fieldErrors.lost_reason) {
        setLostReasonError(result.error.fieldErrors.lost_reason[0])
      } else {
        toast.error('message' in result.error ? result.error.message : 'Failed to close deal')
      }
      return
    }
    toast.success('Deal closed as Lost')
    onClose()
  }

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteDeal(deal.id)
    setIsDeleting(false)
    if (result.error) {
      toast.error('message' in result.error ? result.error.message : 'Failed to delete deal')
      return
    }
    toast.success('Deal deleted')
    onClose()
  }

  function handleEdit() {
    startTransition(() => {
      router.push(`/deals/${deal.id}/edit`)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-gray-100">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{deal.name}</h2>
            <StatusBadge status={deal.status === 'won' ? 'Won' : deal.status === 'lost' ? 'Lost' : deal.stage_name} />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {formatCurrency(deal.value, deal.currency)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Close date</span>
              </div>
              <p className="text-gray-900">{deal.close_date ? formatDate(deal.close_date) : '—'}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Pipeline</span>
              </div>
              <p className="text-gray-900">{deal.pipeline_name}</p>
            </div>
            {deal.owner_name && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Owner</span>
                </div>
                <p className="text-gray-900">{deal.owner_name}</p>
              </div>
            )}
            {contactName && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Contact</span>
                </div>
                <p className="text-gray-900">{contactName}</p>
              </div>
            )}
          </div>

          {deal.lost_reason && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-700 mb-1">Lost reason</p>
              <p className="text-sm text-red-600">{deal.lost_reason}</p>
            </div>
          )}

          {/* Actions for open deals */}
          {deal.status === 'open' && (
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCloseWon}
                  disabled={isClosingWon}
                >
                  <Trophy className="w-4 h-4 mr-1.5" />
                  {isClosingWon ? 'Closing...' : 'Close as Won'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setShowLostForm((v) => !v)}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Close as Lost
                </Button>
              </div>

              {showLostForm && (
                <div className="space-y-2">
                  <Label htmlFor="lost-reason" className="text-xs text-gray-600">
                    Reason for losing *
                  </Label>
                  <textarea
                    id="lost-reason"
                    placeholder="e.g. Budget constraints, went with competitor..."
                    value={lostReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLostReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {lostReasonError && (
                    <p className="text-xs text-red-600">{lostReasonError}</p>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    onClick={handleCloseLost}
                    disabled={isClosingLost}
                  >
                    {isClosingLost ? 'Closing...' : 'Confirm — Close as Lost'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Edit + Delete */}
          <div className="flex gap-2 pt-1 border-t border-gray-100">
            {deal.status === 'open' && (
              <Button size="sm" variant="outline" className="flex-1" onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit deal
              </Button>
            )}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                aria-label="Delete deal"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Activity timeline */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Activity</p>
            <ActivityTimeline activities={deal.activities} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete deal?"
        description={`"${deal.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </div>
  )
}
