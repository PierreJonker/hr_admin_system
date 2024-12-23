import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import bcrypt from "bcrypt";
import { TRPCError } from "@trpc/server";

export const admin_pageRouter = createTRPCRouter({
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "Admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access Denied" });
    }

    const users = await db.user.findMany({
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
          },
        },
        managedDepartments: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return users.map((user) => ({
      ...user,
      departments: user.departments.map((dept) => dept.name).join(", ") || "N/A",
      managedDepartments: user.managedDepartments.map((dept) => dept.name).join(", ") || "N/A",
    }));
  }),

  createUser: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        role: z.enum(["Admin", "Manager", "Employee"]),
        telephone: z.string().optional(),
        departmentIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const existingUser = await db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists.",
        });
      }

      const hashedPassword = await bcrypt.hash("Password123#", 10);

      const newUser = await db.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          role: input.role,
          status: "Active",
          telephone: input.telephone || null,
          password: hashedPassword,
          departments: input.departmentIds
            ? {
                connect: input.departmentIds.map((id) => ({ id })),
              }
            : undefined,
        },
      });

      return { success: true, message: "User created successfully" };
    }),

  getAllDepartments: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "Admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
    }

    const departments = await db.department.findMany({
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        managers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      managerIds: dept.managers.map(manager => manager.id),
      managerNames: dept.managers.map(manager => `${manager.firstName} ${manager.lastName}`).join(", ") || "No Manager",
      users: dept.users.map((user) => `${user.firstName} ${user.lastName}`).join(", ") || "No Users",
    }));
  }),

  createDepartment: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        managerIds: z.array(z.number()).optional(),
        employeeIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const newDepartment = await db.department.create({
        data: {
          name: input.name,
          managers: input.managerIds
            ? {
                connect: input.managerIds.map((id) => ({ id })),
              }
            : undefined,
          users: {
            connect: [
              ...(input.employeeIds?.map((id) => ({ id })) || []),
              ...(input.managerIds?.map((id) => ({ id })) || []) // Auto-connect managers as users
            ]
          },
        },
      });

      return { success: true, message: "Department created successfully" };
    }),

  updateDepartment: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string(),
        managerIds: z.array(z.number()),
        removeFromDepartment: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      // Get current department state
      const currentDepartment = await db.department.findUnique({
        where: { id: input.id },
        include: {
          managers: {
            select: { id: true }
          },
          users: {
            select: { id: true }
          }
        }
      });

      if (!currentDepartment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }

      // Prepare update data
      const updateData: any = {
        name: input.name,
        managers: {
          set: input.managerIds.map(id => ({ id })),
        },
      };

      // If we need to remove users completely from the department
      if (input.removeFromDepartment?.length) {
        updateData.users = {
          disconnect: input.removeFromDepartment.map(id => ({ id }))
        };
      }

      // First update removes managers and users if specified
      await db.department.update({
        where: { id: input.id },
        data: updateData,
      });

      // Second update ensures all managers are department members
      await db.department.update({
        where: { id: input.id },
        data: {
          users: {
            connect: input.managerIds.map(id => ({ id }))
          }
        }
      });

      return { success: true, message: "Department updated successfully" };
    }),

  assignDepartments: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        departmentIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const user = await db.user.update({
        where: { id: input.userId },
        data: {
          departments: {
            set: input.departmentIds.map((deptId) => ({ id: deptId })),
          },
        },
      });

      return { success: true, message: "Departments assigned successfully" };
    }),

  fetchManagers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "Admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
    }

    const managers = await db.user.findMany({
      where: { role: "Manager" },
      select: { id: true, firstName: true, lastName: true },
    });

    return managers.map((manager) => ({
      id: manager.id,
      name: `${manager.firstName} ${manager.lastName}`,
    }));
  }),

  deleteUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      await db.user.delete({
        where: { id: input.userId },
      });

      return { success: true, message: "User deleted successfully" };
    }),

  deleteDepartment: protectedProcedure
    .input(z.object({ departmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      await db.department.delete({
        where: { id: input.departmentId },
      });

      return { success: true, message: "Department deleted successfully" };
    }),

  assignUsersToDepartment: protectedProcedure
    .input(
      z.object({
        departmentId: z.number(),
        userIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      await db.department.update({
        where: { id: input.departmentId },
        data: {
          users: {
            set: input.userIds.map((id) => ({ id })),
          },
        },
      });

      return { success: true, message: "Users assigned to department successfully" };
    }),

  getUserById: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const user = await db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          telephone: true,
          departments: {
            select: { id: true, name: true },
          },
          managedDepartments: {
            select: { id: true, name: true },
          },
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),

  getDepartmentById: protectedProcedure
    .input(z.object({ departmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const department = await db.department.findUnique({
        where: { id: input.departmentId },
        include: {
          users: {
            select: { id: true, firstName: true, lastName: true },
          },
          managers: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      if (!department) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }

      return {
        id: department.id,
        name: department.name,
        managerIds: department.managers.map(manager => manager.id),
        managerNames: department.managers.map(manager => `${manager.firstName} ${manager.lastName}`),
        users: department.users.map((user) => `${user.firstName} ${user.lastName}`),
      };
    }),
});