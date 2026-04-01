import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Ticket             from '@/models/Ticket';

// GET: list user's own tickets
export async function GET() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tickets = await Ticket.find({ userId: user._id }).sort({ lastReplyAt: -1 }).limit(20);
    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST: open a new ticket
export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, body } = await req.json();
    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }
    if (subject.trim().length > 120) {
      return NextResponse.json({ error: 'Subject too long (max 120 chars)' }, { status: 400 });
    }

    const ticket = await Ticket.create({
      userId:   user._id,
      username: user.username || user.email,
      subject:  subject.trim(),
      status:   'open',
      messages: [{ senderRole: 'user', senderName: user.username || user.email, body: body.trim() }],
      lastReplyAt: new Date(),
      readByUser: true,
      readByMod:  false,
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
