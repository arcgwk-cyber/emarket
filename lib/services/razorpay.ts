import Razorpay from 'razorpay';
import crypto from 'crypto';

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured');
  }

  if (process.env.NODE_ENV === 'production' && keyId.startsWith('rzp_test')) {
    throw new Error('Test/Mock Razorpay credentials cannot be used in production');
  }

  return { keyId, keySecret };
}

function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayCredentials();

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export async function createRazorpayOrder(amount: number, receiptId: string) {
  try {
    const order = await getRazorpayClient().orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: receiptId,
    });

    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to initiate gateway transaction');
  }
}

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    const { keySecret } = getRazorpayCredentials();
    const hash = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const expected = Buffer.from(hash, 'hex');
    const received = Buffer.from(razorpaySignature, 'hex');

    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return false;
  }
}
