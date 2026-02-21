"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { UserButton } from "@clerk/nextjs";

interface SidebarProps {
  currentUserClerkId: string;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export default function Sidebar({
  currentUserClerkId,
  selectedConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);

  const conversations = useQuery(api.conversations.getUserConversations, {
    clerkId: currentUserClerkId,
  });

  const allUsers = useQuery(api.users.getAllUsers, {
    currentClerkId: currentUserClerkId,
  });

  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateConversation
  );

  const filteredUsers = allUsers?.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleUserClick = async (otherClerkId: string) => {
    const convId = await getOrCreateConversation({
      currentUserClerkId,
      otherUserClerkId: otherClerkId,
    });
    onSelectConversation(convId as Id<"conversations">);
    setShowUsers(false);
    setSearch("");
  };

  const unreadCounts = useQuery(api.messages.getUnreadCountsForUser, {
  clerkId: currentUserClerkId,
});

  conversations?.map((conv) => {
  const unreadCount = unreadCounts?.[conv._id] ?? 0;
  return (
    <div
      key={conv._id}
      onClick={() => onSelectConversation(conv._id)}
      className={`flex items-center gap-3 p-4 hover:bg-slate-800 cursor-pointer ${
        selectedConversationId === conv._id ? "bg-slate-800" : ""
      }`}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={conv.otherUser?.imageUrl} />
        <AvatarFallback>{conv.otherUser?.name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{conv.otherUser?.name}</p>
        <p className="text-sm text-slate-400 truncate">
          {conv.lastMessage || "No messages yet"}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </div>
  );
})

  return (
    <div className="flex flex-col h-full">
      
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold">Chats</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUsers(!showUsers)}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-full"
          >
            + New
          </button>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-800">
        <Input
          placeholder={showUsers ? "Search users..." : "Search conversations..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {showUsers ? (
          filteredUsers?.length === 0 ? (
            <div className="text-center text-slate-500 mt-10 px-4">
              No users found
            </div>
          ) : (
            filteredUsers?.map((u) => (
              <div
                key={u._id}
                onClick={() => handleUserClick(u.clerkId)}
                className="flex items-center gap-3 p-4 hover:bg-slate-800 cursor-pointer"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.imageUrl} />
                  <AvatarFallback>{u.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-slate-400">{u.email}</p>
                </div>
              </div>
            ))
          )
        ) : 
        conversations?.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 px-4">
            <p className="text-2xl mb-2">💬</p>
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Click "+ New" to start chatting</p>
          </div>
        ) : (
          conversations?.map((conv) => (
            <div
              key={conv._id}
              onClick={() => onSelectConversation(conv._id)}
              className={`flex items-center gap-3 p-4 hover:bg-slate-800 cursor-pointer ${
                selectedConversationId === conv._id ? "bg-slate-800" : ""
              }`}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={conv.otherUser?.imageUrl} />
                <AvatarFallback>{conv.otherUser?.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{conv.otherUser?.name}</p>
                <p className="text-sm text-slate-400 truncate">
                  {conv.lastMessage || "No messages yet"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}