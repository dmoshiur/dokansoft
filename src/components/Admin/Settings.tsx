import React, { useState, useEffect } from 'react';
import { useERPStore } from '../../store';
import { 
  Globe, 
  Shield, 
  Bell, 
  Smartphone, 
  PhoneCall, 
  Mail, 
  Lock, 
  Database, 
  Cpu,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  History,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
  Server,
  Share2,
  Sliders,
  Sparkles,
  LayoutGrid,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const categories = [
  { id: 'general', label: 'General & Branding', icon: Globe },
  { id: 'homepage', label: 'Home Page CMS', icon: FileCode },
  { id: 'communication', label: 'Communication', icon: PhoneCall },
  { id: 'security', label: 'Security & Auth', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system', label: 'System & DB', icon: Cpu },
];

export const Settings: React.FC = () => {
  const { state, saveConfig } = useERPStore();
  const [activeCategory, setActiveCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // General tab states
  const [shopName, setShopName] = useState('');
  const [secondaryLicenseName, setSecondaryLicenseName] = useState('');
  const [address, setAddress] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [themeColor, setThemeColor] = useState('Green');

  // Lovely Enterprise states
  const [lovelyProprietor, setLovelyProprietor] = useState('');
  const [lovelyLicenseNo, setLovelyLicenseNo] = useState('');
  const [lovelyPhone, setLovelyPhone] = useState('');

  // Mahi & Muhi Traders states
  const [mahiProprietor, setMahiProprietor] = useState('');
  const [mahiLicenseNo, setMahiLicenseNo] = useState('');
  const [mahiPhone, setMahiPhone] = useState('');

  // Social states
  const [facebook, setFacebook] = useState('');
  const [youtube, setYoutube] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [linkedin, setLinkedin] = useState('');

  // Home Page CMS tab states
  const [bannerShow, setBannerShow] = useState(true);
  const [bannerText, setBannerText] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDesc, setHeroDesc] = useState('');
  const [heroBtnText, setHeroBtnText] = useState('');
  const [heroBtnLink, setHeroBtnLink] = useState('');
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutDesc, setAboutDesc] = useState('');
  const [aboutOwnerImage, setAboutOwnerImage] = useState('');
  const [aboutOwnerName, setAboutOwnerName] = useState('');

  // Section Visibilities
  const [showEntities, setShowEntities] = useState(true);
  const [showProducts, setShowProducts] = useState(true);
  const [showAchievements, setShowAchievements] = useState(true);
  const [showGallery, setShowGallery] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  useEffect(() => {
    if (state.config) {
      setShopName(state.config.shopName || '');
      setSecondaryLicenseName(state.config.secondaryLicenseName || '');
      setAddress(state.config.address || '');
      setEmailAddress(state.config.emails?.[0] || '');
      setLovelyProprietor(state.config.lovelyProprietor || 'Md. Moshiur Rahman Mohi');
      setLovelyLicenseNo(state.config.lovelyLicenseNo || 'LIC-LE-998877');
      setLovelyPhone(state.config.lovelyPhone || '+8801712-345678');
      setMahiProprietor(state.config.mahiProprietor || 'Mst. Muhi Begum');
      setMahiLicenseNo(state.config.mahiLicenseNo || 'LIC-MM-112233');
      setMahiPhone(state.config.mahiPhone || '+8801911-223344');

      // Extended values
      setSiteTitle(state.config.siteTitle || 'Lovely Enterprise | Premium Agro Inputs & Logistics');
      setFaviconUrl(state.config.faviconUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=32&h=32&fit=crop');
      setThemeColor(state.config.themeColor || 'Green');

      setFacebook(state.config.socialLinks?.facebook || '');
      setYoutube(state.config.socialLinks?.youtube || '');
      setWhatsapp(state.config.socialLinks?.whatsapp || '');
      setLinkedin(state.config.socialLinks?.linkedin || '');

      // CMS
      setBannerShow(state.config.bannerShow !== false);
      setBannerText(state.config.bannerText || '');
      setHeroTitle(state.config.heroTitle || '');
      setHeroDesc(state.config.heroDesc || '');
      setHeroBtnText(state.config.heroBtnText || '');
      setHeroBtnLink(state.config.heroBtnLink || '');
      setAboutTitle(state.config.aboutTitle || '');
      setAboutDesc(state.config.aboutDesc || '');
      setAboutOwnerImage(state.config.aboutOwnerImage || '');
      setAboutOwnerName(state.config.aboutOwnerName || '');

      setShowEntities(state.config.showEntities !== false);
      setShowProducts(state.config.showProducts !== false);
      setShowAchievements(state.config.showAchievements !== false);
      setShowGallery(state.config.showGallery !== false);
      setShowContact(state.config.showContact !== false);
      setShowFooter(state.config.showFooter !== false);
    }
  }, [state.config]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const updatedConfig = {
        ...state.config,
        shopName,
        secondaryLicenseName,
        address,
        emails: [emailAddress],
        lovelyProprietor,
        lovelyLicenseNo,
        lovelyPhone,
        mahiProprietor,
        mahiLicenseNo,
        mahiPhone,

        // Custom Branding
        siteTitle,
        faviconUrl,
        themeColor,

        // Social
        socialLinks: {
          facebook,
          youtube,
          whatsapp,
          linkedin,
        },

        // CMS
        bannerShow,
        bannerText,
        heroTitle,
        heroDesc,
        heroBtnText,
        heroBtnLink,
        aboutTitle,
        aboutDesc,
        aboutOwnerImage,
        aboutOwnerName,

        // Visibilities
        showEntities,
        showProducts,
        showAchievements,
        showGallery,
        showContact,
        showFooter,
      };

      await saveConfig(updatedConfig);
      setStatus({ type: 'success', message: 'System configurations and CMS settings persisted successfully.' });
    } catch (e) {
      setStatus({ type: 'error', message: 'Failed to save configuration settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System & CMS Settings</h1>
          <p className="text-slate-500 mt-1">Configure your ERP preferences, edit landing page CMS, and manage secure database structures.</p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold",
                status.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}
            >
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {status.message}
            </motion.div>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSaving ? 'Saving...' : 'Save Settings & CMS'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Rail */}
        <div className="space-y-1 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm h-fit sticky top-24">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer",
                activeCategory === cat.id 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <cat.icon size={18} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {activeCategory === 'general' && (
                <div className="p-8 space-y-8">
                  <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">General & Identity Configurations</h3>
                      <p className="text-sm text-slate-500">Manage basic corporate identity, trade licenses, contact info, branding, and social handles.</p>
                    </div>
                  </div>

                  {/* Company 1: Lovely Enterprise */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <h4 className="text-sm font-black text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      Lovely Enterprise Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Proprietor Name</label>
                        <input 
                          type="text" 
                          value={lovelyProprietor} 
                          onChange={(e) => setLovelyProprietor(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Trade License Number</label>
                        <input 
                          type="text" 
                          value={lovelyLicenseNo} 
                          onChange={(e) => setLovelyLicenseNo(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Proprietor Phone Number</label>
                        <input 
                          type="text" 
                          value={lovelyPhone} 
                          onChange={(e) => setLovelyPhone(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company 2: Mahi & Muhi Traders */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <h4 className="text-sm font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      Mahi & Muhi Traders Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Proprietor Name</label>
                        <input 
                          type="text" 
                          value={mahiProprietor} 
                          onChange={(e) => setMahiProprietor(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Trade License Number</label>
                        <input 
                          type="text" 
                          value={mahiLicenseNo} 
                          onChange={(e) => setMahiLicenseNo(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Proprietor Phone Number</label>
                        <input 
                          type="text" 
                          value={mahiPhone} 
                          onChange={(e) => setMahiPhone(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* General details and branding */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                      Corporate Identity & Custom Branding
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Primary Company Name</label>
                        <input 
                          type="text" 
                          value={shopName} 
                          onChange={(e) => setShopName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Secondary License Name</label>
                        <input 
                          type="text" 
                          value={secondaryLicenseName} 
                          onChange={(e) => setSecondaryLicenseName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Contact/Support Email Address</label>
                        <input 
                          type="email" 
                          value={emailAddress} 
                          onChange={(e) => setEmailAddress(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Shop Physical Address</label>
                        <input 
                          type="text" 
                          value={address} 
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Public Website Title</label>
                        <input 
                          type="text" 
                          value={siteTitle} 
                          onChange={(e) => setSiteTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Website Favicon Image URL</label>
                        <input 
                          type="url" 
                          value={faviconUrl} 
                          onChange={(e) => setFaviconUrl(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Handles */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                      Public Social Media Links
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Facebook Page URL</label>
                        <input 
                          type="url" 
                          placeholder="https://facebook.com/..." 
                          value={facebook} 
                          onChange={(e) => setFacebook(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">YouTube Channel URL</label>
                        <input 
                          type="url" 
                          placeholder="https://youtube.com/..." 
                          value={youtube} 
                          onChange={(e) => setYoutube(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">WhatsApp URL or Direct Link</label>
                        <input 
                          type="text" 
                          placeholder="https://wa.me/..." 
                          value={whatsapp} 
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">LinkedIn Company Page URL</label>
                        <input 
                          type="url" 
                          placeholder="https://linkedin.com/company/..." 
                          value={linkedin} 
                          onChange={(e) => setLinkedin(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'homepage' && (
                <div className="p-8 space-y-8">
                  <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FileCode size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Home Page CMS Systems</h3>
                      <p className="text-sm text-slate-500">Modify top alert banners, rewrite Hero splash text, about sections, and toggle visual blocks.</p>
                    </div>
                  </div>

                  {/* Alert Banner settings */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                        Top Notification Banner
                      </h4>
                      <button
                        onClick={() => setBannerShow(!bannerShow)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all flex items-center px-1 cursor-pointer",
                          bannerShow ? "bg-slate-900 justify-end" : "bg-slate-300 justify-start"
                        )}
                      >
                        <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                      </button>
                    </div>
                    {bannerShow && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Banner Display Text</label>
                        <textarea 
                          rows={2}
                          value={bannerText} 
                          onChange={(e) => setBannerText(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* Hero Settings */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                      Hero Section Contents
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Hero Section Main Heading</label>
                        <input 
                          type="text" 
                          value={heroTitle} 
                          onChange={(e) => setHeroTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">Hero Description Paragraph</label>
                        <textarea 
                          rows={3}
                          value={heroDesc} 
                          onChange={(e) => setHeroDesc(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Primary Button Text</label>
                          <input 
                            type="text" 
                            value={heroBtnText} 
                            onChange={(e) => setHeroBtnText(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Primary Button Link</label>
                          <input 
                            type="text" 
                            value={heroBtnLink} 
                            onChange={(e) => setHeroBtnLink(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* About section settings */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                      About Us & Leadership Section
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">About Us Header Title</label>
                        <input 
                          type="text" 
                          value={aboutTitle} 
                          onChange={(e) => setAboutTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500">About Us Main Description</label>
                        <textarea 
                          rows={4}
                          value={aboutDesc} 
                          onChange={(e) => setAboutDesc(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Proprietor Display Name (Replaces all Moshiur text)</label>
                          <input 
                            type="text" 
                            value={aboutOwnerName} 
                            onChange={(e) => setAboutOwnerName(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Proprietor Portrait/Image URL</label>
                          <input 
                            type="url" 
                            value={aboutOwnerImage} 
                            onChange={(e) => setAboutOwnerImage(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Toggles */}
                  <div className="space-y-4 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                      Public Web Sections Visibility Controls
                    </h4>
                    <p className="text-xs text-slate-400">Toggle public modules on/off from showing up on the public website layout.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {[
                        { label: 'Show Corporate Entities (Lovely/Mahi)', value: showEntities, set: setShowEntities },
                        { label: 'Show Seed & Chemical Products Grid', value: showProducts, set: setShowProducts },
                        { label: 'Show Achievements & Awards Grid', value: showAchievements, set: setShowAchievements },
                        { label: 'Show Event & Field Gallery Archives', value: showGallery, set: setShowGallery },
                        { label: 'Show Contact & Inquiry Submission Form', value: showContact, set: setShowContact },
                        { label: 'Show Footer Block Details', value: showFooter, set: setShowFooter },
                      ].map((tog, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs">
                          <span className="text-xs font-bold text-slate-700">{tog.label}</span>
                          <button
                            onClick={() => tog.set(!tog.value)}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all flex items-center px-1 cursor-pointer",
                              tog.value ? "bg-slate-900 justify-end" : "bg-slate-300 justify-start"
                            )}
                          >
                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'communication' && <CommunicationSettings />}
              {activeCategory === 'security' && <SecuritySettings />}
              {activeCategory === 'notifications' && <NotificationsSettings />}
              {activeCategory === 'system' && <SystemSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

interface GeneralSettingsProps {
  shopName: string;
  setShopName: (v: string) => void;
  secondaryLicenseName: string;
  setSecondaryLicenseName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  emailAddress: string;
  setEmailAddress: (v: string) => void;
  lovelyProprietor: string;
  setLovelyProprietor: (v: string) => void;
  lovelyLicenseNo: string;
  setLovelyLicenseNo: (v: string) => void;
  lovelyPhone: string;
  setLovelyPhone: (v: string) => void;
  mahiProprietor: string;
  setMahiProprietor: (v: string) => void;
  mahiLicenseNo: string;
  setMahiLicenseNo: (v: string) => void;
  mahiPhone: string;
  setMahiPhone: (v: string) => void;
}

const CommunicationSettings = () => (
  <div className="p-8 space-y-10">
     {/* Voice Provider */}
     <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
           <div className="flex items-center gap-3">
              <PhoneCall size={20} className="text-emerald-600" />
              <h4 className="font-bold text-slate-900">InfoSoft BD Voice API</h4>
           </div>
           <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Active</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">API Base URL</label>
            <input 
              type="text" 
              defaultValue="https://api.infosoftbd.com" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-semibold text-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">API Key</label>
            <input 
              type="password" 
              value="••••••••••••••••" 
              readOnly
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-semibold cursor-default text-slate-800"
            />
          </div>
        </div>
     </div>

     {/* WhatsApp */}
     <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
           <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-emerald-600" />
              <h4 className="font-bold text-slate-900">WhatsApp Gateway</h4>
           </div>
           <select className="bg-slate-50 border-none text-[10px] font-bold text-slate-900 rounded px-2 py-1 focus:ring-0">
             <option>Baileys (QR Scan)</option>
           </select>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-4">
           <div className="w-48 h-48 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center">
              <RefreshCw size={48} className="text-slate-200 animate-spin" />
           </div>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Scan QR to connect WhatsApp</p>
           <button className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">Refresh QR Code</button>
        </div>
     </div>

     {/* SMTP */}
     <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
           <Mail size={20} className="text-emerald-600" />
           <h4 className="font-bold text-slate-900">SMTP Email Configuration</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Host</label>
              <input type="text" placeholder="smtp.gmail.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-800 font-medium" />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Port</label>
              <input type="text" defaultValue="587" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-800 font-medium" />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Encryption</label>
              <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold text-slate-800">
                 <option>TLS</option>
                 <option>SSL</option>
                 <option>None</option>
              </select>
           </div>
        </div>
     </div>
  </div>
);

const SecuritySettings = () => (
  <div className="p-8 space-y-8">
     <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
        <Lock size={24} />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 text-lg">Security & Authentication</h3>
        <p className="text-sm text-slate-500">Manage admin passwords, JWT tokens, and login security.</p>
      </div>
    </div>

    <div className="max-w-xl space-y-6">
       <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Admin Password</label>
          <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-800" />
       </div>
       <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">New Password</label>
          <input type="password" placeholder="Min 8 characters" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-800" />
       </div>
       <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Confirm New Password</label>
          <input type="password" placeholder="Repeat new password" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-slate-800" />
       </div>
       <div className="pt-4 flex items-center gap-4">
          <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors uppercase tracking-widest cursor-pointer">Update Security</button>
          <button className="px-6 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-widest cursor-pointer">Revoke All Tokens</button>
       </div>
    </div>
  </div>
);

const NotificationsSettings = () => {
  const [channels, setChannels] = useState({
    loginAlerts: true,
    campaignComplete: true,
    systemAnomalies: true,
    whatsappDisconnect: true,
    weeklyReport: false,
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
          <Bell size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Alert Channels & Notifications</h3>
          <p className="text-sm text-slate-500">Control what automated security alerts are pushed over SMTP.</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(channels).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <h4 className="font-bold text-slate-800 text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {key === 'loginAlerts' && 'Get notified instantly on every admin session access.'}
                {key === 'campaignComplete' && 'Receive reports immediately when a marketing campaign finishes.'}
                {key === 'systemAnomalies' && 'Alert severity HIGH triggers when server health dips.'}
                {key === 'whatsappDisconnect' && 'Triggers instantly if the WhatsApp session times out.'}
                {key === 'weeklyReport' && 'Receive consolidated financial and audit summaries weekly.'}
              </p>
            </div>
            <button
              onClick={() => setChannels(prev => ({ ...prev, [key]: !value }))}
              className={cn(
                "w-12 h-6 rounded-full transition-all flex items-center px-1 cursor-pointer",
                value ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
              )}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SystemSettings = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [exportCollection, setExportCollection] = useState("all");
  const [exportFormat, setExportFormat] = useState("json");
  const [dbType, setDbType] = useState("Checking...");

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token") || "";
      const res = await fetch("/api/admin/backup/list", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
        setDbType("MongoDB (Active)");
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsLoading(true);
    setActionStatus(null);
    try {
      const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token") || "";
      const res = await fetch("/api/admin/backup/create", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Success: Backup file ${data.backup.filename} created successfully!`);
        fetchBackups();
      } else {
        setActionStatus(`Error: ${data.error || 'Failed to generate backup'}`);
      }
    } catch (e) {
      setActionStatus("Error: Network failure.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you absolutely sure you want to restore and roll back the database to backup ${filename}? Current records will be replaced.`)) {
      return;
    }
    setIsLoading(true);
    setActionStatus(null);
    try {
      const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token") || "";
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus("Success: Database restoration completed. Rollback executed successfully!");
        fetchBackups();
      } else {
        setActionStatus(`Restore Failed: ${data.error}`);
      }
    } catch (e) {
      setActionStatus("Error: Network communication timed out.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token") || "";
    window.open(`${window.location.origin}/api/admin/export/${exportFormat}?collection=${exportCollection}&authorization=Bearer ${token}`);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Database size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">System Maintenance & Backups</h3>
          <p className="text-sm text-slate-500">Run manual system back-ups, manage active MongoDB instances, restore data instantly, and download exports.</p>
        </div>
      </div>

      {actionStatus && (
        <div className={cn(
          "p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2",
          actionStatus.startsWith("Success") 
            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
            : "bg-rose-50 border-rose-200 text-rose-700"
        )}>
          <ShieldAlert size={18} />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* DB Engine Status Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
            <Server size={14} className="text-indigo-500" />
            <span>Database Status</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{dbType}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
            <History size={14} className="text-indigo-500" />
            <span>Scheduled Backup</span>
          </div>
          <p className="text-lg font-bold text-slate-800">Auto Daily (Active)</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
          <button 
            onClick={handleCreateBackup}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
            <span>Backup Database</span>
          </button>
        </div>
      </div>

      {/* Export Segment */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Download size={16} className="text-indigo-600" />
          <span>Format-Driven Report Exporter</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Collection</label>
            <select 
              value={exportCollection}
              onChange={(e) => setExportCollection(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none font-semibold text-slate-800"
            >
              <option value="all">Full Database (All Data)</option>
              <option value="customers">Customers Data</option>
              <option value="campaigns">Marketing Campaigns</option>
              <option value="callLogs">Call Dispatch Logs</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Format</label>
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none font-semibold text-slate-800"
            >
              <option value="json">JSON format (.json)</option>
              <option value="csv">CSV standard (.csv)</option>
              <option value="excel">Microsoft Excel (.xls)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {exportFormat === "json" ? <FileCode size={16} /> : <FileSpreadsheet size={16} />}
              <span>Download Export File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Logs and Rollback */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <History size={16} className="text-indigo-600" />
          <span>Historical Backup Nodes (Full Rollback Support)</span>
        </h4>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4">File Name</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Size</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium italic">
                    No system backups logged. Generate a backup to verify integrity.
                  </td>
                </tr>
              ) : (
                backups.map((bk) => (
                  <tr key={bk.filename} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono text-xs text-indigo-600 font-semibold">{bk.filename}</td>
                    <td className="p-4 font-medium">{new Date(bk.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-semibold text-slate-600">{formatBytes(bk.size)}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded">
                        {bk.databaseType}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRestoreBackup(bk.filename)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        Restore Database
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
