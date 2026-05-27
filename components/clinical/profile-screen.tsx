import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Field = { label: string; value: string };

type Props = {
  user: { name: string; subtitle: string };
  fields: Field[];
  /**
   * Optional content rendered below the identity card. Used by the patient
   * profile to slot in the clinical-baseline editor.
   */
  children?: React.ReactNode;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileScreen({ user, fields, children }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8 md:py-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold tracking-tight">Profile</h1>
        <p className="text-[13px] text-muted-foreground">
          Manage your account and preferences.
        </p>
      </header>

      <Card className="mt-5 gap-0 py-0">
        <CardContent className="flex items-center gap-4 px-5 py-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-[18px] font-medium">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{user.name}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {user.subtitle}
            </p>
          </div>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </CardContent>
        <Separator />
        <CardContent
          className={cn(
            "grid gap-x-6 gap-y-4 px-5 py-5",
            "grid-cols-1 md:grid-cols-2"
          )}
        >
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-[13px]">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
