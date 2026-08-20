import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { getUserById } from "@/src/features/users/actions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: PageProps<"/dashboard/settings/users/[id]">) {
  const { id } = await params;
  const item = await getUserById(id);
  if (!item) notFound();

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader actions={<Button asChild variant="outline"><Link href="/dashboard/settings/users">Back to users</Link></Button>} breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users", href: "/dashboard/settings/users" }, { label: item.name }]} description={item.email} eyebrow="User detail" title={item.name} />
        <dl className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd className="mt-2"><Badge variant={item.status === "ACTIVE" ? "default" : "destructive"}>{item.status}</Badge></dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Role</dt><dd className="mt-2">{item.roleName ?? "Unassigned"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Email verification</dt><dd className="mt-2">{item.emailVerified ? "Verified" : "Unverified"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Created</dt><dd className="mt-2">{item.createdAt.toLocaleDateString("en-GB")}</dd></div>
        </dl>
      </div>
    </PageContainer>
  );
}
