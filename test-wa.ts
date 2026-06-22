import { sendWhatsAppOtp } from "./src/lib/whatsapp";
async function main() {
  const result = await sendWhatsAppOtp("919876543210", "123456");
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error);
