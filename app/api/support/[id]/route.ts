import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Ticket             from '@/models/Ticket';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const ticket = await Ticket.findOne({ _id: id, userId: user._id });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Mark as read by user when they open it
    if (!ticket.readByUser) { ticket.readByUser = true; await ticket.save(); }
    return NextResponse.json({ ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST: user replies to their own ticket
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id }  = await params;
    const { body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: 'Message body is required' }, { status: 400 });

    const ticket = await Ticket.findOne({ _id: id, userId: user._id });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (ticket.status === 'closed') return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 });

    ticket.messages.push({ senderRole: 'user', senderName: user.username || user.email, body: body.trim() });
    ticket.status      = 'open';
    ticket.lastReplyAt = new Date();
    ticket.readByUser  = true;
    ticket.readByMod   = false;
    await ticket.save();

    return NextResponse.json({ success: true, ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// PATCH: user closes their own ticket
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const ticket = await Ticket.findOneAndUpdate(
      { _id: id, userId: user._id },
      { status: 'closed' },
      { new: true },
    );
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
