import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const userRouter = createTRPCRouter({
  getAllEmployees: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await db.user.findUnique({
      where: { 
        id: Number(ctx.session.user.id) 
      },
      include: {
        departments: true,
        managedDepartments: true, // Get departments where user is a manager
      },
    });

    if (!currentUser) throw new Error("User not found");

    // Get departments where the current user is a manager
    const managedDepartmentIds = currentUser.managedDepartments?.map(d => d.id) ?? [];
    
    // Build the query based on user role
    const whereClause = (() => {
      if (currentUser.role === "Admin") {
        return {}; // Admin sees all
      }
      if (currentUser.role === "Manager") {
        return {
          OR: [
            { id: currentUser.id }, // Own profile
            { departments: { some: { id: { in: managedDepartmentIds } } } }, // Users in managed departments
          ],
        };
      }
      return { id: currentUser.id }; // Regular employees see only themselves
    })();

    const employees = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        telephone: true,
        departments: {
          select: {
            id: true,
            name: true,
            managers: {
              select: {
                id: true,
              },
            },
          },
        },
        managedDepartments: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Format the response
    return employees.map((emp) => ({
      ...emp,
      role: emp.role as "Admin" | "Manager" | "Employee",
      status: emp.status as "Active" | "Inactive",
      telephone: emp.telephone || "N/A",
      departments: emp.departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        isManager: dept.managers.some(manager => manager.id === emp.id)
      })),
      managedDepartments: emp.managedDepartments.map(dept => ({
        id: dept.id,
        name: dept.name
      })),
      manager: emp.manager 
        ? `${emp.manager.firstName} ${emp.manager.lastName}`
        : "N/A",
    }));
  }),

  updateEmployee: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        telephone: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(["Admin", "Manager", "Employee"]).optional(),
        status: z.enum(["Active", "Inactive"]).optional(),
        departmentIds: z.array(z.number()).optional(),
        managedDepartmentIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, departmentIds, managedDepartmentIds, ...updates } = input;

      const updatedEmployee = await db.user.update({
        where: { id },
        data: {
          ...updates,
          ...(departmentIds && {
            departments: {
              set: departmentIds.map(deptId => ({ id: deptId }))
            }
          }),
          ...(managedDepartmentIds && {
            managedDepartments: {
              set: managedDepartmentIds.map(deptId => ({ id: deptId }))
            }
          })
        },
        include: {
          departments: {
            select: {
              id: true,
              name: true,
              managers: {
                select: {
                  id: true,
                },
              },
            },
          },
          managedDepartments: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {
        ...updatedEmployee,
        departments: updatedEmployee.departments.map(dept => ({
          id: dept.id,
          name: dept.name,
          isManager: dept.managers.some(manager => manager.id === updatedEmployee.id)
        })),
        managedDepartments: updatedEmployee.managedDepartments.map(dept => ({
          id: dept.id,
          name: dept.name
        })),
        manager: updatedEmployee.manager
          ? `${updatedEmployee.manager.firstName} ${updatedEmployee.manager.lastName}`
          : "N/A",
      };
    }),
});