import { redirect } from 'next/navigation'

interface DealDetailPageProps {
  params: { id: string }
}

// Direct navigation to /deals/[id] redirects to the board with the panel open
export default function DealDetailPage({ params }: DealDetailPageProps) {
  redirect(`/deals?deal=${params.id}`)
}
