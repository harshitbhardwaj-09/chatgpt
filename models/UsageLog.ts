import mongoose, { Document, Schema } from 'mongoose';

interface IUsageLog extends Document {
  userId: mongoose.Types.ObjectId;          // Reference to User document
  clerkUserId: string;                      // Clerk user ID for quick lookups
  conversationId?: mongoose.Types.ObjectId; // Reference to Conversation document
  messageId?: mongoose.Types.ObjectId;     // Reference to Message document
  aiModel: string;                         // AI model used (e.g., "gemini-2.5-flash")
  operation: string;                       // Type of operation (chat, completion, embedding)
  tokenUsage: {
    promptTokens: number;                  // Input tokens
    completionTokens?: number;             // Output tokens (for chat/completion)
    totalTokens: number;                   // Total tokens used
  };
  cost: {
    usd: number;                           // Cost in USD
    currency: string;                      // Currency code
    ratePerToken?: number;                 // Rate per token used
  };
  performance: {
    responseTimeMs: number;                // Total response time
    streamingTimeMs?: number;              // Time to complete streaming
    firstTokenTimeMs?: number;             // Time to first token (TTFT)
  };
  metadata: {
    temperature?: number;                  // Generation parameters
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    finishReason?: string;                 // How generation ended
    userAgent?: string;                    // Client user agent
    ipAddress?: string;                    // Client IP (hashed for privacy)
    region?: string;                       // Server region
    sessionId?: string;                    // Session identifier
  };
  billing: {
    planType: string;                      // User's plan (free, pro, enterprise)
    quotaUsed: number;                     // Quota consumed
    quotaRemaining: number;                // Quota remaining
    billingPeriod: string;                 // Current billing period
  };
  createdAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  clerkUserId: {
    type: String,
    required: true,
    index: true
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    index: true
  },
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    index: true
  },
  aiModel: {
    type: String,
    required: true,
    enum: ['gemini-2.5-flash', 'gemini-pro', 'gpt-4', 'gpt-3.5-turbo', 'embedding-v2'],
    index: true
  },
  operation: {
    type: String,
    required: true,
    enum: ['chat', 'completion', 'embedding', 'moderation'],
    index: true
  },
  tokenUsage: {
    promptTokens: {
      type: Number,
      required: true,
      min: 0
    },
    completionTokens: {
      type: Number,
      min: 0
    },
    totalTokens: {
      type: Number,
      required: true,
      min: 0
    }
  },
  cost: {
    usd: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY']
    },
    ratePerToken: {
      type: Number,
      min: 0
    }
  },
  performance: {
    responseTimeMs: {
      type: Number,
      required: true,
      min: 0
    },
    streamingTimeMs: {
      type: Number,
      min: 0
    },
    firstTokenTimeMs: {
      type: Number,
      min: 0
    }
  },
  metadata: {
    temperature: {
      type: Number,
      min: 0,
      max: 2
    },
    maxTokens: {
      type: Number,
      min: 1
    },
    topP: {
      type: Number,
      min: 0,
      max: 1
    },
    frequencyPenalty: {
      type: Number,
      min: -2,
      max: 2
    },
    presencePenalty: {
      type: Number,
      min: -2,
      max: 2
    },
    finishReason: {
      type: String,
      enum: ['stop', 'length', 'content_filter', 'tool_calls', 'error']
    },
    userAgent: String,
    ipAddress: String, // Should be hashed for privacy
    region: String,
    sessionId: String
  },
  billing: {
    planType: {
      type: String,
      required: true,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    quotaUsed: {
      type: Number,
      required: true,
      min: 0
    },
    quotaRemaining: {
      type: Number,
      required: true,
      min: 0
    },
    billingPeriod: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only track creation time
});

// Indexes for efficient queries and analytics
UsageLogSchema.index({ clerkUserId: 1, createdAt: -1 }); // User usage over time
UsageLogSchema.index({ model: 1, createdAt: -1 }); // Model usage analytics
UsageLogSchema.index({ operation: 1, createdAt: -1 }); // Operation type analytics
UsageLogSchema.index({ 'cost.usd': -1, createdAt: -1 }); // Expensive operations
UsageLogSchema.index({ 'tokenUsage.totalTokens': -1 }); // High token usage
UsageLogSchema.index({ 'billing.planType': 1, createdAt: -1 }); // Plan-based analytics
UsageLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 31536000 }); // Auto-delete after 1 year

// Static methods for analytics and reporting
UsageLogSchema.statics.getUserUsageStats = function(clerkUserId: string, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        clerkUserId,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokenUsage.totalTokens' },
        totalCost: { $sum: '$cost.usd' },
        avgResponseTime: { $avg: '$performance.responseTimeMs' },
        modelBreakdown: {
          $push: {
            aiModel: '$aiModel',
            tokens: '$tokenUsage.totalTokens',
            cost: '$cost.usd'
          }
        }
      }
    }
  ]);
};

UsageLogSchema.statics.getDailyUsage = function(clerkUserId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        clerkUserId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        },
        requests: { $sum: 1 },
        tokens: { $sum: '$tokenUsage.totalTokens' },
        cost: { $sum: '$cost.usd' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
};

UsageLogSchema.statics.getModelUsageStats = function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$aiModel',
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokenUsage.totalTokens' },
        totalCost: { $sum: '$cost.usd' },
        avgResponseTime: { $avg: '$performance.responseTimeMs' },
        uniqueUsers: { $addToSet: '$clerkUserId' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { totalRequests: -1 } }
  ]);
};

UsageLogSchema.statics.checkQuotaUsage = function(clerkUserId: string, billingPeriod: string) {
  return this.aggregate([
    {
      $match: {
        clerkUserId,
        'billing.billingPeriod': billingPeriod
      }
    },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: '$tokenUsage.totalTokens' },
        totalCost: { $sum: '$cost.usd' },
        lastQuotaRemaining: { $last: '$billing.quotaRemaining' },
        planType: { $last: '$billing.planType' }
      }
    }
  ]);
};

// Instance methods
UsageLogSchema.methods.calculateCost = function(aiModel: string, tokens: number) {
  // Cost calculation logic based on model and tokens
  const rates: { [key: string]: number } = {
    'gemini-2.5-flash': 0.000002, // $0.002 per 1K tokens
    'gemini-pro': 0.000005,       // $0.005 per 1K tokens
    'gpt-4': 0.00003,             // $0.03 per 1K tokens
    'gpt-3.5-turbo': 0.000002     // $0.002 per 1K tokens
  };
  
  const rate = rates[aiModel] || 0.000002;
  this.cost.usd = (tokens / 1000) * rate;
  this.cost.ratePerToken = rate / 1000;
  
  return this.cost.usd;
};

export default mongoose.models.UsageLog || mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);
export type { IUsageLog };