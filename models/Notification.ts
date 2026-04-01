import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    // null = global broadcast for all users
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title:    { type: String, required: true },
    body:     { type: String, required: true },
    type:     { type: String, enum: ['global', 'personal', 'system'], default: 'global' },
    // array of userIds who have dismissed/read this notification
    readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    icon:     { type: String, default: '📢' }, // emoji icon
  },
  { timestamps: true },
);

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
