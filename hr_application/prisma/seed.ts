import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "test@gmail.com" },
    update: {},
    create: {
      firstName: "Pierre",
      lastName: "Jonker",
      telephone: "0723661611",
      email: "test@gmail.com",
      password: hashedPassword,
      status: "Active",
    },
  });

  console.log("Superuser created!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
