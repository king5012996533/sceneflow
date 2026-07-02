"use client";

import { create } from "zustand";

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
  clearSession: () => void;
  fetchSession: () => Promise<void>;
};

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearSession: () => {
    set({ user: null });
    fetch("/canvas/api/auth/logout", { method: "POST" });
  },
  fetchSession: async () => {
    try {
      const res = await fetch("/canvas/api/auth/session", { credentials: "include" });
      const data = await res.json();
      set({ user: data.user });
    } catch {
      set({ user: null });
    }
  },
}));
