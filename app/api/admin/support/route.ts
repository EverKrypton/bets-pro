import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Ticket             from '@/models/Ticket';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || !['admin','mod'].includes(admin.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'open';
    const query  = status === 'all' ? {} : { status };

    const tickets = await Ticket.find(query).sort({ lastReplyAt: -1 }).limit(50);
    const openCount = await Ticket.countDocuments({ status: { $in: ['open', 'pending'] } });
    return NextResponse.json({ tickets, openCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
