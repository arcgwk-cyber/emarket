'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  MapPin, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Save, 
  Navigation, 
  Map,
  Loader2,
  Phone,
  User,
  Home,
  Briefcase,
  Users,
  Compass
} from 'lucide-react';

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
  latitude: string | null;
  longitude: string | null;
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
  
  // Geolocation & Map Coordinates State
  const [lat, setLat] = useState<string | null>(null);
  const [lng, setLng] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
    setLat(null);
    setLng(null);
    setShowMap(false);
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
    setLat(addr.latitude || null);
    setLng(addr.longitude || null);
    setShowMap(false);
    setIsFormOpen(true);
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'E-Market-Browser-Geolocator'
        }
      });
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        
        // Auto-fill fields if they are empty or update them
        const road = addr.road || addr.suburb || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
        const cityVal = addr.city || addr.town || addr.village || addr.county || '';
        const stateVal = addr.state || '';
        const postcode = addr.postcode || '';
        
        if (road) setStreet(road);
        if (suburb) setArea(suburb);
        if (cityVal) setCity(cityVal);
        if (stateVal) setState(stateVal);
        if (postcode) setPincode(postcode.replace(/\s/g, ''));
        
        if (data.display_name && !flat) {
          // Preset flat description with building name or road number if available
          setFlat(addr.house_number || 'Flat / Shop');
        }
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        await reverseGeocode(latitude, longitude);
        setGeoLoading(false);
      },
      (error) => {
        console.error('Error fetching location:', error);
        alert('Unable to retrieve location. Please grant permission or search using the map.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Dynamically load Leaflet when showMap is toggled
  useEffect(() => {
    if (showMap && isFormOpen) {
      const loadLeaflet = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          const L = (window as any).L;
          if (!L) return;

          // Default coordinates to Visakhapatnam center if none are set
          const startLat = lat ? parseFloat(lat) : 17.6868;
          const startLng = lng ? parseFloat(lng) : 83.2185;

          const map = L.map('map-container').setView([startLat, startLng], 15);
          mapInstanceRef.current = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);
          markerRef.current = marker;

          const updateMarkerCoords = async (latitude: number, longitude: number) => {
            setLat(latitude.toFixed(6));
            setLng(longitude.toFixed(6));
            await reverseGeocode(latitude, longitude);
          };

          marker.on('dragend', async () => {
            const position = marker.getLatLng();
            await updateMarkerCoords(position.lat, position.lng);
          });

          map.on('click', async (e: any) => {
            marker.setLatLng(e.latlng);
            await updateMarkerCoords(e.latlng.lat, e.latlng.lng);
          });
        };
        document.body.appendChild(script);

        return () => {
          link.remove();
          script.remove();
        };
      };

      loadLeaflet();
    }
  }, [showMap, isFormOpen]);

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
      latitude: lat || undefined,
      longitude: lng || undefined,
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
          setAddresses(
            addresses.map(a => {
              if (a.id === editingAddress.id) return json.data;
              return json.data.isDefault ? { ...a, isDefault: false } : a;
            })
          );
        } else {
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
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-4 py-2 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
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
              className={`p-5 rounded-2xl border transition-all ${
                addr.isDefault 
                  ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10' 
                  : 'border-zinc-200 dark:border-zinc-800'
              } flex flex-col justify-between gap-4`}
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    {addr.addressType}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-2">{addr.recipientName}</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">{addr.recipientMobile}</p>
                
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2.5 leading-relaxed">
                  {addr.houseFlat}, {addr.building && `${addr.building}, `}{addr.street}, {addr.area && `${addr.area}, `}{addr.city}, {addr.state} - {addr.pincode}
                </p>
                {addr.landmark && (
                  <p className="text-[10px] text-zinc-400 mt-1">Landmark: {addr.landmark}</p>
                )}
                {addr.latitude && addr.longitude && (
                  <p className="text-[9px] font-semibold text-zinc-400 mt-1.5 flex items-center gap-1">
                    <Compass className="h-3 w-3 text-orange-500" />
                    Coordinates: {addr.latitude}, {addr.longitude}
                  </p>
                )}
              </div>

              <div className="flex gap-2 border-t border-zinc-55 dark:border-zinc-800/60 pt-3">
                <button
                  onClick={() => handleOpenEdit(addr)}
                  className="rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 p-2 text-zinc-505 dark:text-zinc-400 hover:text-zinc-800 flex items-center gap-1 text-xs font-semibold"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2 text-rose-500 flex items-center gap-1 text-xs font-semibold ml-auto"
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
            className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 sm:p-7 shadow-2xl flex flex-col gap-4.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <MapPin className="h-4.5 w-4.5 text-emerald-500" />
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

            {/* Smart Location Detectors */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={geoLoading}
                className="h-10 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 text-[11px] font-black text-zinc-600 dark:text-zinc-350 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {geoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                ) : (
                  <Navigation className="h-4 w-4 text-emerald-500" />
                )}
                Auto-Detect
              </button>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={`h-10 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  showMap 
                    ? 'border-emerald-500 bg-emerald-50/20 text-emerald-700 dark:text-emerald-400' 
                    : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-350'
                }`}
              >
                <Map className="h-4 w-4 text-emerald-500" />
                Select on Map
              </button>
            </div>

            {/* Leaflet Interactive Map Container */}
            {showMap && (
              <div className="space-y-1.5">
                <div id="map-container" className="w-full h-44 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner relative overflow-hidden z-10" />
                <p className="text-[9px] font-bold text-zinc-400 text-center uppercase tracking-wide">
                  Drag the pin or click on the map to autofill address
                </p>
              </div>
            )}

            {/* Latitude / Longitude coordinates indicator */}
            {lat && lng && (
              <div className="p-2.5 bg-orange-50/30 border border-orange-100 rounded-xl text-[10px] font-bold text-orange-700 flex items-center justify-between">
                <span>📍 Verified Coordinates</span>
                <span>Lat: {lat} • Lng: {lng}</span>
              </div>
            )}

            {/* Recipient Details */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405 flex items-center gap-1">
                  <User className="h-3 w-3 text-zinc-400" /> Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-zinc-400" /> Mobile
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9999999999"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
            </div>

            {/* Flat & Building */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Flat / Door / Shop No.</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 201"
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Building / Apartment</label>
                <input
                  type="text"
                  placeholder="e.g. Lotus Heights"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
            </div>

            {/* Street & Area */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Street / Road / Block</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Park Street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Area / Locality</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 4"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
            </div>

            {/* City, State, Pincode */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vizag"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">State</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AP"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Pincode</label>
                <input
                  type="text"
                  required
                  placeholder="530046"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
            </div>

            {/* Address Type Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Address Tag</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: 'home', icon: Home },
                  { tag: 'office', icon: Briefcase },
                  { tag: 'parents', icon: Users },
                  { tag: 'friend', icon: User },
                  { tag: 'other', icon: MapPin }
                ].map(({ tag, icon: IconComponent }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setType(tag)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                      type === tag
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                        : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-405'
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    {tag.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Landmark & Instructions */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near Hub"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-405">Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Leave with guard"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="h-9.5 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-medium"
                />
              </div>
            </div>

            {/* Set Default */}
            <label className="flex items-center gap-2 select-none cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">
                Set as Default Delivery Address
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black py-3.5 shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="h-4.5 w-4.5" />
              Save Shipping Address
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
