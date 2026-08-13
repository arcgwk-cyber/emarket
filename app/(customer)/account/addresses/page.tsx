import React from 'react';
import { redirect } from 'next/navigation';
import AddressManager from '@/components/customer/AddressManager';
import { getCurrentUser } from '@/lib/services/auth';
import { db } from '@/lib/db';
import { customerAddresses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // 1. Fetch saved addresses directly in server component
  const list = await db.query.customerAddresses.findMany({
    where: eq(customerAddresses.userId, user.id),
    orderBy: desc(customerAddresses.createdAt),
  });

  // 2. Map database properties to match TypeScript interface
  const mappedList = list.map((addr) => ({
    id: addr.id,
    recipientName: addr.recipientName,
    recipientMobile: addr.recipientMobile,
    houseFlat: addr.houseFlat,
    building: addr.building,
    street: addr.street,
    area: addr.area,
    landmark: addr.landmark,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    addressType: addr.addressType,
    deliveryInstructions: addr.deliveryInstructions,
    isDefault: addr.isDefault,
    latitude: addr.latitude,
    longitude: addr.longitude,
  }));

  return (
    <div className="py-10">
      <AddressManager initialAddresses={mappedList} />
    </div>
  );
}
