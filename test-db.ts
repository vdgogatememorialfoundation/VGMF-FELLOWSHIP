import prisma from "./src/lib/db";
async function main() {
  const settings = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  console.log(JSON.stringify(settings, null, 2));
}
main().catch(console.error);
