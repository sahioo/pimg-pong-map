import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { id: tournamentId } = await params
  const body = await req.json().catch(() => ({}))
  const userId: string | undefined = body.userId ?? user.id

  if (userId !== user.id) {
    return NextResponse.json(
      { error: "You can only check in yourself" },
      { status: 403 }
    )
  }

  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })

  if (!t) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
  }

  if (!["CHECKIN", "REGISTRATION_CLOSED"].includes(t.status)) {
    return NextResponse.json(
      { error: `Cannot checkin in status ${t.status}` },
      { status: 400 }
    )
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId,
        userId,
      },
    },
  })

  if (!participant) {
    return NextResponse.json({ error: "Not joined" }, { status: 404 })
  }

  if (participant.joinStatus !== "PAID") {
    return NextResponse.json(
      { error: `Not eligible (joinStatus=${participant.joinStatus})` },
      { status: 400 }
    )
  }

  const updated = await prisma.tournamentParticipant.update({
    where: {
      tournamentId_userId: {
        tournamentId,
        userId,
      },
    },
    data: { checkedIn: true },
  })

  return NextResponse.json(updated)
}