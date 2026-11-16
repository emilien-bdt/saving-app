import { LogOut } from "lucide-react";
import { logout } from "@/shared/auth/actions";
import { Button } from "@/shared/ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut aria-hidden />
        Se déconnecter
      </Button>
    </form>
  );
}
