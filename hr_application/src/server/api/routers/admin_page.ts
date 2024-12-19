import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import bcrypt from "bcrypt";
import { TRPCError } from "@trpc/server";

export const admin_pageRouter = createTRPCRouter({
  // Fetch all users
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
        departments: { select: { id: true, name: true } },
      },
    });

    return users.map((user) => ({
      ...user,
      departments: user.departments.map((dept) => dept.name).join(", ") || "N/A",
    }));
  }),

  // Create a new user with a default password
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

      // Hash the default password
      const hashedPassword = await bcrypt.hash("Password123#", 10);

      // Create the new user
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
            ? { connect: input.departmentIds.map((id) => ({ id })) }
            : undefined,
        },
      });

      return { success: true, message: "User created successfully" };
    }),

  // Assign departments to an existing user
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
});
