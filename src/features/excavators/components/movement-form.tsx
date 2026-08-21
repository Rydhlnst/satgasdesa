import { recordExcavatorMovementAction } from "@/app/dashboard/excavators/_actions";
import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MovementFormProps = {
  excavatorId: string;
  currentBlockId: string | null;
  blocks: Array<{ id: string; code: string; name: string }>;
};

export function MovementForm({ excavatorId, currentBlockId, blocks }: MovementFormProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader><CardTitle className="font-heading text-xl uppercase tracking-wide">Record movement</CardTitle></CardHeader>
      <CardContent>
        <ActionForm action={recordExcavatorMovementAction} className="space-y-5">
          <input name="excavatorId" type="hidden" value={excavatorId} />
          <div className="space-y-2"><Label htmlFor="movementType">Movement type</Label><select className="h-10 w-full border border-input bg-background px-3 text-sm" defaultValue={currentBlockId ? "TRANSFER" : "ENTRY"} id="movementType" name="movementType"><option value="ENTRY">Entry</option><option value="TRANSFER">Transfer</option><option value="EXIT">Exit</option></select></div>
          <div className="space-y-2"><Label htmlFor="toBlockId">Destination block</Label><select className="h-10 w-full border border-input bg-background px-3 text-sm" defaultValue="" id="toBlockId" name="toBlockId"><option value="">Select destination</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.code} · {block.name}</option>)}</select><p className="text-xs text-muted-foreground">Required for entry and transfer. Leave empty for exit.</p></div>
          <div className="space-y-2"><Label htmlFor="occurredAt">Occurred date</Label><Input defaultValue={new Date().toISOString().slice(0, 10)} id="occurredAt" name="occurredAt" type="date" required /></div>
          <div className="space-y-2"><Label htmlFor="movementNotes">Notes</Label><Textarea id="movementNotes" name="notes" maxLength={5000} /></div>
          <Button type="submit">Save movement</Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
