'use client';

import React, { useState } from 'react';
import { Plus, MapPin, Trash2, Edit3, X, Check, Save } from 'lucide-react';

interface Address {
  id: string;
  recipientName: string;
  recipientMobile: string;
  houseFlat: string;
  building: string | null;
  street: string;
  area: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  addressType: string;
  deliveryInstructions: string | null;
  isDefault: boolean;
}

interface AddressManagerProps {
  initialAddresses: Address[];
}

export default function AddressManager({ initialAddresses }: AddressManagerProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [flat, setFlat] = useState('');
  const [building, setBuilding] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [type, setType] = useState('home');
  const [instructions, setInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setName('');
    setMobile('');
    setFlat('');
    setBuilding('');
    setStreet('');
    setArea('');
    setLandmark('');
    setCity('');
    setState('');
    setPincode('');
    setType('home');
    setInstructions('');
    setIsDefault(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (addr: Address) => {
    setEditingAddress(addr);
    setName(addr.recipientName);
    setMobile(addr.recipientMobile);
    setFlat(addr.houseFlat);
    setBuilding(addr.building || '');
    setStreet(addr.street);
    setArea(addr.area || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setType(addr.addressType);
    setInstructions(addr.deliveryInstructions || '');
    setIsDefault(addr.isDefault);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      id: editingAddress?.id,
      recipientName: name,
      recipientMobile: mobile,
      houseFlat: flat,
      building,
      street,
      area,
      landmark,
      city,
      state,
      pincode,
      addressType: type,
      deliveryInstructions: instructions,
      isDefault,
    };

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (editingAddress?.id) {
          // Update in place
          setAddresses(
            addresses.map(a => {
              if (a.id === editingAddress.id) return json.data;
              return json.data.isDefault ? { ...a, isDefault: false } : a;
            })
          );
        } else {
          // Append
          setAddresses([
            json.data,
            ...addresses.map(a => json.data.isDefault ? { ...a, isDefault: false } : a)
          ]);
        }
        setIsFormOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addrId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/addresses?id=${addrId}`, { method: 'DELETE' });
      if (res.ok) {
        setAddresses(addresses.filter(a => a.id !== addrId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Saved Addresses</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage saved shipping destinations for checkout</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-4 py-2 shadow-sm transition-all flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl p-6 dark:border-zinc-800">
          <MapPin className="h-10 w-10 text-zinc-400 mx-auto" />
          <h3 className="mt-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">No Saved Addresses</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1 leading-normal">
            You don't have any saved shipping addresses yet. Save your home or office address to checkout faster.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div 
              key={addr.id}
              className={`rounded-2xl border p-5 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between gap-4 transition-all ${
                addr.isDefault 
                  ? 'border-emerald-500/30 bg-emerald-50/10 dark:border-emerald-500/20' 
                  : 'border-zinc-100 dark:border-zinc-800'
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                  <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400">
                    {addr.addressType}
                  </span>
                  
                  {addr.isDefault && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      Default
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                  {addr.recipientName}
                </h4>
                <p className="text-[11px] text-zinc-500 font-semibold">{addr.recipientMobile}</p>
                
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                  {addr.houseFlat}, {addr.building && `${addr.building}, `}{addr.street}, {addr.area && `${addr.area}, `}
                  {addr.city}, {addr.state} - <span className="font-semibold">{addr.pincode}</span>
                </p>
                
                {addr.deliveryInstructions && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 border-t border-zinc-50 dark:border-zinc-800/80 pt-2 mt-1 leading-normal italic">
                    Instructions: "{addr.deliveryInstructions}"
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-2 border-t border-zinc-50 dark:border-zinc-800 pt-3">
                <button
                  disabled={loading}
                  onClick={() => handleOpenEdit(addr)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-600 hover:text-emerald-500 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                
                <button
                  disabled={loading}
                  onClick={() => handleDelete(addr.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. ADDRESS ADD/EDIT MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsFormOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          
          <form 
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {editingAddress ? 'Edit Shipping Address' : 'Add Shipping Address'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)} 
                className="text-zinc-400 hover:text-zinc-650"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Recipient Mobile</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+919999999999"
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* Flat & Building */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">House / Flat / Shop No.</label>
                <input
                  type="text"
                  required
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Building / Apartment Name</label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* Street & Area */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Street Name / Block</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Area / Locality</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* City, State, Pincode */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">State</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Pincode</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* Address Type Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Address Type</label>
              <div className="flex flex-wrap gap-2">
                {['home', 'office', 'parents', 'friend', 'other'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                      type === t
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                        : 'border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Landmark & Instructions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Landmark (Optional)</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Delivery Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Leave package with guard, ring doorbell..."
                className="h-16 rounded-lg border border-zinc-200 p-2 text-xs outline-none focus:border-emerald-500 resize-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
            </div>

            {/* Set Default */}
            <label className="flex items-center gap-2 mt-1 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Set as Default shipping address
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold py-3.5 shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <Save className="h-4 w-4" />
              Save Address
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
