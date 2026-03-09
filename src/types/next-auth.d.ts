import type { AppRole } from "@/lib/roles";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      username: string;
      email?: string | null;
      role: AppRole;
      effectiveRole: AppRole;
      avatarUrl: string | null;
      agent: boolean;
      approvalStatus: string;
    };
  }

  interface User {
    id: string;
    username: string;
    role: AppRole;
    effectiveRole: AppRole;
    avatarUrl: string | null;
    agent: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
