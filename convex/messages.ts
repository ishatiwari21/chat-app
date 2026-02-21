import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      body: args.body,
      deleted: false,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessage: args.body,
      lastMessageTime: Date.now(),
    });

    return messageId;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const userTyping = existing.find((t) => t.userId === args.userId);

    if (userTyping) {
      await ctx.db.patch(userTyping._id, { lastTypedAt: Date.now() });
    } else {
      await ctx.db.insert("typingStatus", {
        conversationId: args.conversationId,
        userId: args.userId,
        lastTypedAt: Date.now(),
      });
    }
  },
});

export const getTypingUsers = query({
  args: { conversationId: v.id("conversations"), currentUserId: v.string() },
  handler: async (ctx, args) => {
    const twoSecondsAgo = Date.now() - 2000;
    const typing = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return typing
      .filter(
        (t) =>
          t.userId !== args.currentUserId && t.lastTypedAt > twoSecondsAgo
      )
      .map((t) => t.userId);
  },
});

export const getUnreadCount = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return 0;

    const lastRead = conversation.lastReadTime?.[args.userId] ?? 0;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return unreadMessages.filter(
      (m) => m._creationTime > lastRead && m.senderId !== args.userId
    ).length;
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    const lastReadTime = conversation.lastReadTime ?? {};
    lastReadTime[args.userId] = Date.now();

    await ctx.db.patch(args.conversationId, { lastReadTime });
  },
});

export const getUnreadCountsForUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();
    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.clerkId)
    );

    const counts: Record<string, number> = {};

    for (const conv of userConversations) {
      const lastRead = conv.lastReadTime?.[args.clerkId] ?? 0;
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conv._id)
        )
        .collect();

      counts[conv._id] = messages.filter(
        (m) => m._creationTime > lastRead && m.senderId !== args.clerkId
      ).length;
    }

    return counts;
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { deleted: true });
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const userReaction = existing.find(
      (r) => r.userId === args.userId && r.emoji === args.emoji
    );

    if (userReaction) {
      await ctx.db.delete(userReaction._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: args.userId,
        emoji: args.emoji,
      });
    }
  },
});

export const getReactions = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const allReactions: Record<string, { emoji: string; userIds: string[] }[]> = {};

    for (const msg of messages) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      const grouped: Record<string, string[]> = {};
      for (const r of reactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = [];
        grouped[r.emoji].push(r.userId);
      }

      allReactions[msg._id] = Object.entries(grouped).map(([emoji, userIds]) => ({
        emoji,
        userIds,
      }));
    }

    return allReactions;
  },
});