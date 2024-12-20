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
      },
    });

    return users.map((user) => ({
      ...user,
      departments: user.departments.map((dept) => dept.name).join(", ") || "N/A",
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
        User: {
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
      managerId: dept.managerId,
      users: dept.User.map((user) => `${user.firstName} ${user.lastName}`).join(", ") || "No Users",
    }));
  }),

  createDepartment: protectedProcedure
  .input(
    z.object({
      name: z.string(),
      managerId: z.number().optional(),
      employeeIds: z.array(z.number()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    if (ctx.session.user.role !== "Admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
    }

    // Create the department
    const newDepartment = await db.department.create({
      data: {
        name: input.name,
        managerId: input.managerId || null,
        User: input.employeeIds
          ? {
              connect: input.employeeIds.map((id) => ({ id })),
            }
          : undefined,
      },
    });
    
    // If a manager is assigned, associate the manager with the department
    if (input.managerId) {
      await db.user.update({
        where: { id: input.managerId },
        data: {
          departments: {
            connect: { id: newDepartment.id },
          },
        },
      });
    }
    
    return { success: true, message: "Department created successfully" };
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
          User: {
            connect: input.userIds.map((id) => ({ id })),
          },
        },
      });

      return { success: true, message: "Users assigned to department successfully" };
    }),

  // Get a user by ID
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
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),

  // Delete a user by ID
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

  // Get a department by ID
  getDepartmentById: protectedProcedure
    .input(z.object({ departmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const department = await db.department.findUnique({
        where: { id: input.departmentId },
        include: {
          User: {
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
        managerId: department.managerId,
        users: department.User.map((user) => `${user.firstName} ${user.lastName}`),
      };
    }),

  // Delete a department by ID
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
});
