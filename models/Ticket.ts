import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    senderRole: { type: String, enum: ['user', 'mod', 'admin'], required: true },
    senderName: { type: String, required: true },
    body:       { type: String, required: true },
  },
  { timestamps: true },
);

const TicketSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    subject:  { type: String, required: true },
    status:   { type: String, enum: ['open', 'pending', 'closed'], default: 'open' },
    messages: [MessageSchema],
    lastReplyAt: { type: Date, default: Date.now },
    readByUser:  { type: Boolean, default: true  }, // user has seen latest mod reply
    readByMod:   { type: Boolean, default: false }, // mod has seen latest user msg
  },
  { timestamps: true },
);

export default mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
