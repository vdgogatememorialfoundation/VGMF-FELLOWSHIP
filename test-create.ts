import { createAndSendOtp } from "./src/lib/otp";
async function main() {
  const result = await createAndSendOtp({ channel: "phone", phone: "9876543210" });
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error);
