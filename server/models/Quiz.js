import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['flashcard', 'mcq'],
        default: 'flashcard',
    },
    answer: {
        type: String,
        required: true,
        trim: true,
    },
    options: [{
        type: String,
        trim: true,
    }],
    explanation: {
        type: String,
        trim: true,
        default: '',
    },
});

const attemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    totalQuestions: {
        type: Number,
        required: true,
    },
    completedAt: {
        type: Date,
        default: Date.now,
    },
});

const quizSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: [true, 'Quiz title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: '',
    },
    questions: [questionSchema],
    attempts: [attemptSchema],
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
    },
}, {
    timestamps: true,
});

// Index for fast group lookups
quizSchema.index({ groupId: 1, status: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
