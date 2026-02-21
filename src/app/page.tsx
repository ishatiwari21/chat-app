"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";

export default function Home() {
  const { user, isLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      upsertUser({
        clerkId: user.id,
        name: user.fullName ?? user.username ?? "Anonymous",
        email: user.emailAddresses[0]?.emailAddress ?? "",
        imageUrl: user.imageUrl,
      });
    }
  }, [isLoaded, user]);

  if (!isLoaded)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    );

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      
      <div
        className={`${selectedConversationId ? "hidden md:flex" : "flex"} w-full md:w-80 flex-col border-r border-slate-800`}
      >
        <Sidebar
          currentUserClerkId={user!.id}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      <div
        className={`${selectedConversationId ? "flex" : "hidden md:flex"} flex-1 flex-col`}
      >
        {selectedConversationId ? (
          <ChatArea
            conversationId={selectedConversationId}
            currentUserClerkId={user!.id}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            <div className="text-center">
              <p className="text-2xl mb-2">💬</p>
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}