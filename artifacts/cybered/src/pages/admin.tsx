import { useListUsers, useUpdateUserRole } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Admin() {
  const { user } = useAuth();
  const { data: users, isLoading, refetch } = useListUsers({ query: { enabled: user?.role === "admin" } as any });
  const { mutate: updateRole } = useUpdateUserRole();
  const { toast } = useToast();

  if (user?.role !== "admin") {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center h-64 text-destructive font-mono border border-destructive p-8 bg-destructive/10">
          <h2 className="text-xl font-bold mb-2">ACCESS DENIED</h2>
          <p>Insufficient privileges to access this sector.</p>
        </div>
      </Shell>
    );
  }

  const handleRoleChange = (userId: number, newRole: "admin" | "editor" | "viewer") => {
    updateRole(
      { userId, data: { role: newRole } },
      {
        onSuccess: () => {
          toast({ title: "SYSTEM UPDATED", description: "Operator clearance level modified." });
          refetch();
        },
        onError: () => {
          toast({ title: "UPDATE FAILED", description: "Unable to modify clearance level.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Shell>
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
          System Administration
        </h1>
        <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">Operator Clearance Management</p>
      </div>

      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Callsign</TableHead>
              <TableHead>Comms Link</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-[200px]">Clearance Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  SCANNING NETWORK...
                </TableCell>
              </TableRow>
            ) : users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-muted-foreground">{u.id}</TableCell>
                <TableCell className="font-bold">{u.username}</TableCell>
                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {format(new Date(u.createdAt), "yyyy-MM-dd HH:mm")}
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={u.role}
                    onValueChange={(val: any) => handleRoleChange(u.id, val)}
                    disabled={u.id === user.id} // prevent self-demotion
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <Badge variant="destructive" className="mr-2">ADMIN</Badge>
                      </SelectItem>
                      <SelectItem value="editor">
                        <Badge variant="default" className="mr-2">EDITOR</Badge>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <Badge variant="secondary" className="mr-2">VIEWER</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {users?.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  NO OPERATORS FOUND.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Shell>
  );
}
