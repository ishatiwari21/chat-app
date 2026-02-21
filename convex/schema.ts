import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    lastSeen: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  conversations: defineTable({
    participantIds: v.array(v.string()),
    lastMessageTime: v.number(),
    lastMessage: v.optional(v.string()),
    lastReadTime: v.optional(v.record(v.string(), v.number())),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    body: v.string(),
    deleted: v.optional(v.boolean()),
  }).index("by_conversation", ["conversationId"]),

  typingStatus: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    lastTypedAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.string(),
    emoji: v.string(),
  }).index("by_message", ["messageId"]),
});