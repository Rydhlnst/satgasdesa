import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { CreateUserForm } from "@/src/features/users/components/create-user-form";
import { UserStatusForm } from "@/src/features/users/components/user-status-form";
import { assignUserRole, getRoles, getUsers } from "@/src/features/users/actions";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: PageProps<"/dashboard/settings/users">) {
  const params = await searchParams;
  const query = typeof params.query === "string" ? params.query : "";
  const status = params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : undefined;
  const roleId = typeof params.role === "string" ? params.role : undefined;
  const [users, roles] = await Promise.all([getUsers({ query, status, roleId }), getRoles()]);

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]} description="Manage account access and assign one operational role per internal user." eyebrow="Settings" title="Internal Users" />

        <form className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row" method="get">
          <input
            name="query"
            defaultValue={query}
            placeholder="Search name or email"
            className="h-10 min-w-0 flex-1 border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select name="role" defaultValue={roleId ?? ""} className="h-10 border border-border bg-background px-3 text-sm">
            <option value="">All roles</option>
            {roles.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <select name="status" defaultValue={status ?? ""} className="h-10 border border-border bg-background px-3 text-sm">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <Button type="submit" variant="outline">Filter</Button>
          <Button asChild type="button" variant="ghost"><Link href="/dashboard/settings/users">Reset</Link></Button>
        </form>

        <CreateUserForm roles={roles} />

        <section className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-5">
                    <Link href={`/dashboard/settings/users/${item.id}`} className="font-semibold underline-offset-4 hover:underline">{item.name}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{item.email}</p>
                  </td>
                  <td className="px-5 py-5">
                    <form action={assignUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={item.id} />
                      <select
                        name="roleId"
                        defaultValue={item.roleId ?? ""}
                        className="h-9 border border-border bg-background px-3 text-xs uppercase tracking-wider"
                        aria-label={`Role for ${item.name}`}
                      >
                        <option value="" disabled>
                          Select role
                        </option>
                        {roles.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="xs" variant="outline">
                        Save
                      </Button>
                    </form>
                  </td>
                <td className="px-5 py-5">
                    <div className="space-y-2"><Badge variant={item.status === "ACTIVE" ? "default" : "destructive"}>{item.status}</Badge><p className="text-xs text-muted-foreground">{item.emailVerified ? "Email verified" : "Email unverified"}</p></div>
                  </td>
                  <td className="px-5 py-5 text-right">
                    <UserStatusForm userId={item.id} userName={item.name} status={item.status as "ACTIVE" | "INACTIVE"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3 md:hidden">
          {users.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><Link href={`/dashboard/settings/users/${item.id}`} className="font-semibold underline-offset-4 hover:underline">{item.name}</Link><p className="mt-1 text-xs text-muted-foreground">{item.email}</p></div>
                <Badge variant={item.status === "ACTIVE" ? "default" : "destructive"}>{item.status}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Role</dt><dd className="mt-1">{item.roleName ?? "Unassigned"}</dd></div><div><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-1">{item.emailVerified ? "Verified" : "Unverified"}</dd></div></dl>
              <div className="mt-4 flex justify-end"><UserStatusForm userId={item.id} userName={item.name} status={item.status as "ACTIVE" | "INACTIVE"} /></div>
            </article>
          ))}
        </section>
      </div>
    </PageContainer>
  );
}
