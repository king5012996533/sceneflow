"use client";

import { create } from "zustand";

import { isAuthPage, setActiveLocalUserId } from "@/lib/user-data-scope";

export type LocalUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type UserStore = {
  user: LocalUser | null;
  setUser: (user: LocalUser | null) => void;
  clearSession: () => Promise<void>;
  fetchSession: () => Promise<void>;
};

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearSession: async () => {
    set({ user: null });
    setActiveLocalUserId(null);
    await fetch("/canvas/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" }).catch(() => null);
  },
  fetchSession: async () => {
    try {
      const res = await fetch("/canvas/api/auth/session", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (data.user?.id) {
        const changed = setActiveLocalUserId(data.user.id);
        if (changed && !isAuthPage()) {
          window.location.reload();
          return;
        }
      } else {
        setActiveLocalUserId(null);
      }
      set({ user: data.user });
    } catch {
      set({ user: null });
      setActiveLocalUserId(null);
    }
  },
}));
