"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { LogOut, Moon, Sun, UserRound, Monitor } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/src/lib/auth/auth-client";

type UserMenuProps = {
  userName: string;
  userEmail: string;
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Open account menu for ${userName}`} className="rounded-lg border border-border bg-muted text-foreground hover:bg-accent" size="icon-sm" variant="ghost">
          <Avatar size="sm">
            <AvatarFallback className="bg-sidebar-primary font-semibold text-sidebar-primary-foreground">{initials(userName) || <UserRound aria-hidden="true" />}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block truncate">{userName}</span>
          <span className="mt-1 block truncate font-normal normal-case tracking-normal text-muted-foreground">{userEmail}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onSelect={() => void handleSignOut()}>
          <LogOut aria-hidden="true" />
          {isPending ? "Keluar…" : "Keluar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Tema tampilan</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
          <DropdownMenuRadioItem value="light"><Sun aria-hidden="true" />Terang</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon aria-hidden="true" />Gelap</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor aria-hidden="true" />Sistem</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
