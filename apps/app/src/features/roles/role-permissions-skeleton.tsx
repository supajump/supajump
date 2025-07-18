import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function RolePermissionsSkeleton() {
  // Show 4 rows as a reasonable default
  const rows = Array.from({ length: 4 })
  const columns = ["view", "create", "edit", "delete", "manage", "invite"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Resource</TableHead>
              {columns.map((action) => (
                <TableHead key={action} className="text-center w-[100px]">
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableHead>
              ))}
              <TableHead className="w-[80px] text-center">Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </TableCell>
                {columns.map((action) => (
                  <TableCell key={action} className="text-center">
                    <Skeleton className="h-4 w-4 mx-auto" />
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <Skeleton className="h-8 w-8 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}