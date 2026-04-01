import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Notification       from '@/models/Notification';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationId } = await req.json();

    if (notificationId) {
      const notification = await Notification.findOne({
        _id: notificationId,
        $or: [{ type: 'global' }, { userId: user._id }],
      });
      if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await Notification.findByIdAndUpdate(notificationId, { $addToSet: { readBy: user._id } });
    } else {
      // Mark all as read
      await Notification.updateMany(
        { $or: [{ type: 'global' }, { userId: user._id }], readBy: { $ne: user._id } },
        { $addToSet: { readBy: user._id } },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
