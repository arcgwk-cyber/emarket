'use client';

import React, { useState } from 'react';
import { Save, Plus, X, Globe, Phone, Mail, Award, MapPin, BarChart3, HelpCircle, Loader2 } from 'lucide-react';

interface StoreConfig {
  storeName: string;
  storeLogo: string;
  supportEmail: string;
  supportPhone: string;
  companyName: string;
  registeredAddress: string;
  gstin: string;
  cin: string;
  locations: string[];
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
  googleMapsUrl: string;
  googleAnalyticsCode: string;
  googleTagCode: string;
  footerText: string;
  grievanceOfficerName: string;
  grievanceOfficerEmail: string;
}

interface SettingsFormProps {
  initialConfig: StoreConfig;
}

export default function SettingsForm({ initialConfig }: SettingsFormProps) {
  const [config, setConfig] = useState<StoreConfig>(initialConfig);
  const [newLocation, setNewLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [name]: value,
      },
    }));
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocation && !config.locations.includes(newLocation)) {
      setConfig((prev) => ({
        ...prev,
        locations: [...prev.locations, newLocation],
      }));
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setConfig((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l !== loc),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setErrorMsg(json.message || 'Failed to save settings');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to save configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-5xl px-4 py-8 font-sans flex flex-col gap-8">
      
      {/* Header bar */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Admin Console settings</h1>
          <p className="text-xs text-zinc-500 mt-1">Configure global store brand identifiers, legal entities, locations, and codes</p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-6 py-2.5 shadow-md flex items-center gap-1.5 transition-all"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Configuration
        </button>
      </div>

      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30">
          ✓ Global configuration settings saved successfully!
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30">
          ⚠ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: SECTIONS */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* SECTION 1: STORE DETAILS */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-5">
            <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-50 dark:border-zinc-850">
              <Award className="h-4.5 w-4.5 text-emerald-500" />
              Corporate Identity & Brand Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Store Name</label>
                <input
                  type="text"
                  required
                  name="storeName"
                  value={config.storeName}
                  onChange={handleChange}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Registered Company Name</label>
                <input
                  type="text"
                  required
                  name="companyName"
                  value={config.companyName}
                  onChange={handleChange}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">GSTIN (15-digit Tax Code)</label>
                <input
                  type="text"
                  name="gstin"
                  value={config.gstin}
                  onChange={handleChange}
                  placeholder="e.g. 07AAAAA1111A1Z1"
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 uppercase"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Corporate Identity Number (CIN)</label>
                <input
                  type="text"
                  name="cin"
                  value={config.cin}
                  onChange={handleChange}
                  placeholder="e.g. U74999DL2026PTC123456"
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 uppercase"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Registered Office Address</label>
              <textarea
                required
                name="registeredAddress"
                value={config.registeredAddress}
                onChange={handleChange}
                rows={2}
                className="rounded-lg border border-zinc-200 p-2 text-xs outline-none focus:border-emerald-500 resize-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" /> Support Email
                </label>
                <input
                  type="email"
                  required
                  name="supportEmail"
                  value={config.supportEmail}
                  onChange={handleChange}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" /> Support Helpline Number
                </label>
                <input
                  type="text"
                  required
                  name="supportPhone"
                  value={config.supportPhone}
                  onChange={handleChange}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Store Logo URL</label>
              <input
                type="text"
                name="storeLogo"
                value={config.storeLogo}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
            </div>

          </div>

          {/* SECTION 2: SERVICE LOCATIONS */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-5">
            <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-50 dark:border-zinc-850">
              <MapPin className="h-4.5 w-4.5 text-emerald-500" />
              Service Areas / Delivery Locations
            </h3>

            <div className="flex flex-wrap gap-2 min-h-12 border border-zinc-100 dark:border-zinc-850 bg-zinc-55/30 p-3.5 rounded-xl">
              {config.locations.map((loc) => (
                <span
                  key={loc}
                  className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                >
                  {loc}
                  <button type="button" onClick={() => handleRemoveLocation(loc)} className="text-emerald-500 hover:text-rose-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter city/area name..."
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-850 dark:bg-zinc-950 dark:text-zinc-200 max-w-[250px]"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Location
              </button>
            </div>
          </div>

          {/* SECTION 3: COMPLIANCE DETAILS */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-5">
            <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-50 dark:border-zinc-850">
              <Globe className="h-4.5 w-4.5 text-emerald-500" />
              Indian eCommerce Grievance Officer Binds
            </h3>

            <p className="text-[11px] text-zinc-500 leading-normal">
              Consumer Protection (E-Commerce) Rules, 2020 requires display of grievance officer contact details for Indian user complaints.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Grievance Officer Name</label>
                <input
                  type="text"
                  required
                  name="grievanceOfficerName"
                  value={config.grievanceOfficerName}
                  onChange={handleChange}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Officer Email Address</label>
                <input
                  type="email"
                  required
                  name="grievanceOfficerEmail"
                  value={config.grievanceOfficerEmail}
                  onChange={handleChange}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SCRIPTS, SOCIALS, FOOTER */}
        <div className="flex flex-col gap-8">
          
          {/* Social Links */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-50 dark:border-zinc-800">
              Social Media Accounts
            </h4>
            <div className="flex flex-col gap-3 text-xs font-semibold">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-zinc-500">Facebook URL</label>
                <input
                  type="text"
                  name="facebook"
                  value={config.socialMedia.facebook}
                  onChange={handleSocialChange}
                  className="h-8 rounded border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-zinc-500">Instagram URL</label>
                <input
                  type="text"
                  name="instagram"
                  value={config.socialMedia.instagram}
                  onChange={handleSocialChange}
                  className="h-8 rounded border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-zinc-500">Twitter (X) URL</label>
                <input
                  type="text"
                  name="twitter"
                  value={config.socialMedia.twitter}
                  onChange={handleSocialChange}
                  className="h-8 rounded border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Integration Scripts */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-50 dark:border-zinc-800">
              <BarChart3 className="h-4 w-4 inline mr-1 text-emerald-500" />
              Tracking & analytics Codes
            </h4>
            <div className="flex flex-col gap-3 text-xs font-semibold">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-zinc-500">Google Analytics ID</label>
                <input
                  type="text"
                  name="googleAnalyticsCode"
                  value={config.googleAnalyticsCode}
                  onChange={handleChange}
                  placeholder="G-XXXXXXXXXX"
                  className="h-8 rounded border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-zinc-500">Google Tag Manager ID</label>
                <input
                  type="text"
                  name="googleTagCode"
                  value={config.googleTagCode}
                  onChange={handleChange}
                  placeholder="AW-XXXXXXXXXX"
                  className="h-8 rounded border border-zinc-200 px-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-zinc-500">Google Maps Embed iframe Src</label>
                <input
                  type="text"
                  name="googleMapsUrl"
                  value={config.googleMapsUrl}
                  onChange={handleChange}
                  placeholder="https://google.com/maps/embed/..."
                  className="h-8 rounded border border-zinc-200 px-2 text-[10px] outline-none focus:border-emerald-500 truncate"
                />
              </div>
            </div>
          </div>

          {/* Footer Copyright Text */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-3">
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
              Footer Text
            </h4>
            <textarea
              name="footerText"
              value={config.footerText}
              onChange={handleChange}
              rows={2}
              className="rounded border border-zinc-200 p-2 text-xs outline-none focus:border-emerald-500 resize-none"
            />
          </div>

        </div>

      </div>

    </form>
  );
}
