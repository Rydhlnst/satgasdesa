import { addDailyInformationFollowUpAction, transitionDailyInformationAction } from "@/app/dashboard/information/_actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DailyInformationStatus } from "@/src/features/daily-information/constants";

export function TransitionInformationForm({ id, statuses }: { id: string; statuses: readonly DailyInformationStatus[] }) {
  return <Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Update workflow</CardTitle></CardHeader><CardContent>{statuses.length ? <form action={transitionDailyInformationAction} className="space-y-5"><input name="id" type="hidden" value={id} /><div className="space-y-2"><Label htmlFor="status">Next status</Label><select className="h-10 w-full border border-input bg-background px-3 text-sm" defaultValue="" id="status" name="status" required><option disabled value="">Select next status</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div><div className="space-y-2"><Label htmlFor="followUp">Follow-up note</Label><Textarea id="followUp" name="followUp" required maxLength={10000} placeholder="Describe the action taken for this transition." /></div><Button type="submit">Save transition</Button></form> : <p className="text-sm leading-relaxed text-muted-foreground">This record is closed. No further workflow transition is available.</p>}</CardContent></Card>;
}

export function FollowUpForm({ id }: { id: string }) {
  return <Card className="shadow-sm"><CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Add follow-up</CardTitle></CardHeader><CardContent><form action={addDailyInformationFollowUpAction} className="space-y-5"><input name="id" type="hidden" value={id} /><div className="space-y-2"><Label htmlFor="note">Follow-up note</Label><Textarea id="note" name="note" required maxLength={5000} /></div><Button type="submit" variant="outline">Add note</Button></form></CardContent></Card>;
}
