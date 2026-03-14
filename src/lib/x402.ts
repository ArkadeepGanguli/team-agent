import { settleFacinetPayment } from "./facinet";

export type PaymentVerification = {
  success: boolean;
  txHash?: string;
  challenge?: { message: string; amount: string; currency: string };
};

export async function verifyAndSettlePayment(request: Request): Promise<PaymentVerification> {
  const paymentHeader = request.headers.get("x-payment");

  if (!paymentHeader) {
    return {
      success: false,
      challenge: {
        message: "Payment required for agent execution",
        amount: "0.01",
        currency: "USDC"
      }
    };
  }

  const result = await settleFacinetPayment(paymentHeader);
  const txHash = (result as { txHash?: string }).txHash;

  return {
    success: Boolean((result as { success?: boolean }).success),
    txHash
  };
}