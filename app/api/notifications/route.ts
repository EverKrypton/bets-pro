import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Notification       from '@/models/Notification';

export async function GET() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch global + personal notifications, not read by this user
    const notifications = await Notification.find({
      $or: [
        { type: 'global', readBy: { $ne: user._id } },
        { userId: user._id, readBy: { $ne: user._id } },
      ],
    }).sort({ createdAt: -1 }).limit(20);

    return NextResponse.json({ notifications, unread: notifications.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
