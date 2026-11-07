"use client";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { updateName } from "./actions";

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateName, null);
  const router = useRouter();
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <Field label="Visningsnavn">
          <input name="name" defaultValue={name} required maxLength={40} className={inputClass} />
        </Field>
        <ErrorText>{state?.error}</ErrorText>
        {state?.ok && <p className="text-sm text-ok">Lagret</p>}
        <Button type="submit" disabled={pending}>Lagre</Button>
      </form>
      <Button
        variant="secondary"
        onClick={async () => {
          await authClient.signOut();
          router.replace("/logg-inn");
          router.refresh();
        }}
      >
        Logg ut
      </Button>
    </div>
  );
}
