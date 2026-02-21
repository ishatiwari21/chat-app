"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  currentUserClerkId: string;
  onBack: () => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (isThisYear) {
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      ", " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } else {
    return (
      date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      ", " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }
}

export default function ChatArea({
  conversationId,
  currentUserClerkId,
  onBack,
}: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showTyping, setShowTyping] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [failedMessage, setFailedMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.messages.getMessages, { conversationId });
  const reactions = useQuery(api.messages.getReactions, { conversationId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const setTyping = useMutation(api.messages.setTyping);
  const markAsRead = useMutation(api.messages.markAsRead);
  const typingUsers = useQuery(api.messages.getTypingUsers, {
    conversationId,
    currentUserId: currentUserClerkId,
  });
  const onlineUsers = useQuery(api.users.getOnlineUsers, {});
  const updateLastSeen = useMutation(api.users.updateLastSeen);

  const conversations = useQuery(api.conversations.getUserConversations, {
    clerkId: currentUserClerkId,
  });
  const currentConv = conversations?.find((c) => c._id === conversationId);
  const otherUser = currentConv?.otherUser;

  useEffect(() => {
    updateLastSeen({ clerkId: currentUserClerkId });
    const interval = setInterval(() => {
      updateLastSeen({ clerkId: currentUserClerkId });
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUserClerkId]);

  useEffect(() => {
    markAsRead({ conversationId, userId: currentUserClerkId });
  }, [conversationId, messages]);

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (typingUsers && typingUsers.length > 0) {
      setShowTyping(true);
      const timer = setTimeout(() => setShowTyping(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowTyping(false);
    }
  }, [typingUsers]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    setIsAtBottom(atBottom);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const body = newMessage.trim();
    setSendError(false);
    try {
      await sendMessage({
        conversationId,
        senderId: currentUserClerkId,
        body,
      });
      setNewMessage("");
      setFailedMessage("");
      setIsAtBottom(true);
    } catch {
      setSendError(true);
      setFailedMessage(body);
    }
  };

  const handleRetry = () => {
    setNewMessage(failedMessage);
    setSendError(false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setTyping({ conversationId, userId: currentUserClerkId });
  };

  const isOtherUserOnline = onlineUsers?.includes(otherUser?.clerkId ?? "");

  if (messages === undefined) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-700 animate-pulse" />
          <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div className="h-10 w-48 bg-slate-700 rounded-2xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <button
          onClick={onBack}
          className="md:hidden text-slate-400 hover:text-white mr-1"
        >
          ←
        </button>
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherUser?.imageUrl} />
            <AvatarFallback>{otherUser?.name?.[0]}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
              isOtherUserOnline ? "bg-green-500" : "bg-slate-500"
            }`}
          />
        </div>
        <div>
          <p className="font-semibold">{otherUser?.name}</p>
          <p className="text-xs text-slate-400">
            {isOtherUserOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages?.length === 0 && (
          <div className="text-center text-slate-500 mt-20">
            <p className="text-2xl mb-2">👋</p>
            <p>No messages yet. Say hello!</p>
          </div>
        )}

        {messages?.map((msg) => {
          const isMe = msg.senderId === currentUserClerkId;
          const msgReactions = reactions?.[msg._id] ?? [];
          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
            >
              <div className="flex flex-col">
                <div className="flex items-end gap-2">
                  {isMe && !msg.deleted && (
                    <button
                      onClick={() => deleteMessage({ messageId: msg._id })}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs mb-1 transition-opacity"
                    >
                      Delete
                    </button>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-slate-800 text-white rounded-bl-sm"
                    }`}
                  >
                    {msg.deleted ? (
                      <p className="italic text-slate-400 text-sm">
                        This message was deleted
                      </p>
                    ) : (
                      <p>{msg.body}</p>
                    )}
                    <p className="text-xs mt-1 opacity-60">
                      {formatTimestamp(msg._creationTime)}
                    </p>
                  </div>
                </div>

                {!msg.deleted && (
                  <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}>
                    {msgReactions.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() =>
                          toggleReaction({
                            messageId: msg._id,
                            userId: currentUserClerkId,
                            emoji: r.emoji,
                          })
                        }
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          r.userIds.includes(currentUserClerkId)
                            ? "bg-indigo-600 border-indigo-500"
                            : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {r.emoji} {r.userIds.length}
                      </button>
                    ))}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() =>
                            toggleReaction({
                              messageId: msg._id,
                              userId: currentUserClerkId,
                              emoji,
                            })
                          }
                          className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {showTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 px-4 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!isAtBottom && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setIsAtBottom(true);
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm shadow-lg"
        >
          ↓ New messages
        </button>
      )}

      {sendError && (
        <div className="mx-4 mb-2 p-2 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-between text-sm">
          <span className="text-red-300">Failed to send message</span>
          <button
            onClick={handleRetry}
            className="text-red-300 hover:text-white underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

      <div className="p-4 border-t border-slate-800 flex gap-2">
        <Input
          value={newMessage}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
        />
        <Button
          onClick={handleSend}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Send
        </Button>
      </div>
    </div>
  );
}