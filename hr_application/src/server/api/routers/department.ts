import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const departmentRouter = createTRPCRouter({
  // Fetch all departments with managers and status
  getAllDepartments: protectedProcedure.query(async () => {
    const departments = await db.department.findMany({
      select: {
        id: true,
        name: true,
        managers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,  // Get manager's status instead of department status
          },
        },
        users: {
          select: {
            status: true,  // Get users' status to determine department activity
          },
        },
      },
    });
    
    return departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      // Consider a department active if it has any active users or managers
      status: dept.managers.some(m => m.status === "Active") || 
              dept.users.some(u => u.status === "Active") ? "Active" : "Inactive",
      managers: dept.managers.map(manager => 
        `${manager.firstName} ${manager.lastName}`
      ).join(", ") || "No Manager"
    }));
  }),

  // Update department users' status
  updateDepartmentStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["Active", "Inactive"])
    }))
    .mutation(async ({ input }) => {
      // Update all users and managers in the department
      await db.user.updateMany({
        where: {
          OR: [
            { departments: { some: { id: input.id } } },
            { managedDepartments: { some: { id: input.id } } }
          ]
        },
        data: {
          status: input.status
        }
      });

      // Get updated department data
      const updated = await db.department.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          managers: {
            select: {
              firstName: true,
              lastName: true,
              status: true,
            }
          },
          users: {
            select: {
              status: true,
            }
          }
        }
      });

      if (!updated) {
        throw new Error("Department not found");
      }

      return {
        id: updated.id,
        name: updated.name,
        status: input.status,
        managers: updated.managers.map(m => `${m.firstName} ${m.lastName}`).join(", ") || "No Manager"
      };
    }),
});