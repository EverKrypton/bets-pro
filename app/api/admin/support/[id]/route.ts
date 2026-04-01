import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Ticket             from '@/models/Ticket';

// POST: mod/admin replies to ticket
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || !['admin','mod'].includes(admin.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id }  = await params;
    const { body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const ticket = await Ticket.findById(id);
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    ticket.messages.push({
      senderRole: admin.role as 'mod'|'admin',
      senderName: `Support (${admin.username || admin.email})`,
      body:       body.trim(),
    });
    ticket.status      = 'pending'; // waiting for user response
    ticket.lastReplyAt = new Date();
    ticket.readByUser  = false; // user hasn't seen this reply yet
    ticket.readByMod   = true;
    await ticket.save();

    return NextResponse.json({ success: true, ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// PATCH: mod changes ticket status
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || !['admin','mod'].includes(admin.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id }     = await params;
    const { status } = await req.json();
    if (!['open','pending','closed'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const ticket = await Ticket.findByIdAndUpdate(id, { status }, { new: true });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, ticket });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
