import mongoose, { Document, Schema, models, Model } from 'mongoose';

export interface IFeedback extends Document {
  user: mongoose.Schema.Types.ObjectId;
  feedbackType: string;
  message: string;
  createdAt: Date;
}

const FeedbackSchema: Schema<IFeedback> = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  feedbackType: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const FeedbackModel: Model<IFeedback> = models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default FeedbackModel; 