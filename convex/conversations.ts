import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateConversation = mutation({
  args: {
    currentUserClerkId: v.string(),
    otherUserClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();

    const existing = allConversations.find(
      (c) =>
        c.participantIds.includes(args.currentUserClerkId) &&
        c.participantIds.includes(args.otherUserClerkId)
    );

    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      participantIds: [args.currentUserClerkId, args.otherUserClerkId],
      lastMessageTime: Date.now(),
      lastMessage: "",
    });
  },
});

export const getUserConversations = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();
    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.clerkId)
    );

    const conversationsWithUsers = await Promise.all(
      userConversations.map(async (conv) => {
        const otherClerkId = conv.participantIds.find(
          (id) => id !== args.clerkId
        );
        const otherUser = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", otherClerkId!))
          .first();
        return { ...conv, otherUser };
      })
    );

    return conversationsWithUsers.sort(
      (a, b) => b.lastMessageTime - a.lastMessageTime
    );
  },
});