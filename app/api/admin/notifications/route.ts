import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Notification       from '@/models/Notification';

// GET: list recent notifications sent
export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const notifications = await Notification.find({ type: 'global' }).sort({ createdAt: -1 }).limit(20);
    return NextResponse.json({ notifications });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST: send global push notification to all users
export async function POST(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { title, body, icon } = await req.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const notification = await Notification.create({
      userId: null,
      title:  title.trim(),
      body:   body.trim(),
      type:   'global',
      icon:   icon?.trim() || '📢',
      readBy: [],
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
