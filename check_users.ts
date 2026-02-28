
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { name: true, slug: true, email: true }
    });
    console.log("-----------------------------------------");
    console.log("AVAILABLE USERS TO BOOK:");
    console.log("-----------------------------------------");
    users.forEach(u => {
        console.log(`Name: ${u.name}`);
        console.log(`Slug: ${u.slug}  <-- USE THIS IN /book user: ...`);
        console.log(`Email: ${u.email}`);
        console.log("-----------------------------------------");
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
