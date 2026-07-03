import React, { useState } from 'react';
import { useERPStore } from '../../store';
import { Award } from '../../types';
import { 
  Trophy, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Upload, 
  X, 
  Calendar, 
  Building2, 
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const AwardsManagement: React.FC = () => {
  const { state, addAward, updateAward, deleteAward } = useERPStore();
  const awards = state.awards || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setYear('');
    setCompany('');
    setDescription('');
    setImage('');
    setEditId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (award: Award) => {
    setTitle(award.title);
    setYear(award.year);
    setCompany(award.company);
    setDescription(award.description);
    setImage(award.image || '');
    setEditId(award.id);
    setIsModalOpen(true);
  };

  const handleOpenPreview = (award: Award) => {
    setSelectedAward(award);
    setIsPreviewOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size should not exceed 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      toast.success("Image uploaded and prepared successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !year || !company || !description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const awardData = {
        title,
        year,
        company,
        description,
        image
      };

      if (editId) {
        await updateAward(editId, awardData);
        toast.success("Award updated successfully.");
      } else {
        await addAward(awardData);
        toast.success("Award added successfully.");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to save award.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this award?")) {
      try {
        await deleteAward(id);
        toast.success("Award deleted successfully.");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete award.");
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Awards & Achievements</h1>
            <p className="text-sm text-slate-500 mt-1">Manage public dealer credentials, certifications, and national accolades.</p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm hover:shadow transition-all duration-200 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Award</span>
        </button>
      </div>

      {/* Awards Grid */}
      {awards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No Awards Registered</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Accolades and credentials you add here will automatically sync and display on the certificates and awards page of the public website.</p>
          <button
            onClick={handleOpenAdd}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Award</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {awards.map((award) => (
            <div 
              key={award.id}
              className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[380px] flex flex-col group cursor-pointer"
            >
              {/* Thumbnail Container (Default View) */}
              <div className="h-48 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                {award.image ? (
                  <img 
                    src={award.image} 
                    alt={award.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <ImageIcon className="w-12 h-12" />
                    <span className="text-xs font-medium">No Image</span>
                  </div>
                )}
                
                {/* Year Badge */}
                <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
                  {award.year}
                </div>
              </div>

              {/* Card Body (Default Visible) */}
              <div className="p-6 flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-slate-900 text-lg line-clamp-2">
                  {award.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-2">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="line-clamp-1">{award.company}</span>
                </div>
              </div>

              {/* Hover Overlay (Full Content) */}
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between z-10 text-slate-900 shadow-xl">
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">
                    {award.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{award.company}</span>
                    <span>•</span>
                    <span>{award.year}</span>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed overflow-y-auto max-h-[160px] custom-scrollbar">
                    {award.description}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenPreview(award)}
                    className="p-2.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(award)}
                    className="p-2.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(award.id)}
                    className="p-2.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900">{editId ? "Edit Award Details" : "Add New Award Accolade"}</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {/* Image Upload Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Award Image / Trophy Photo</label>
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-4 bg-slate-50 relative">
                    {image ? (
                      <div className="w-full h-44 rounded-lg overflow-hidden relative group">
                        <img 
                          src={image} 
                          alt="Uploaded Award Preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <button 
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full shadow transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6 text-center">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">Upload Award Document/Photo</p>
                        <p className="text-xs text-slate-400 mt-1">Accepts PNG, JPG, GIF up to 2MB. Stored locally in MongoDB.</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 w-full">
                      <label className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all">
                        <Upload className="w-4 h-4" />
                        <span>Select Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="hidden" 
                        />
                      </label>
                      <input 
                        type="text" 
                        placeholder="Or paste an image URL directly..." 
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        className="flex-[2] px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 font-medium focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Award Title <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Best Regional Hardware Dealer"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Year */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Year <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 2025"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Company / Conferred By */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Conferred By / Issuer <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Lovely Group"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Award Description <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <textarea 
                      required
                      rows={4}
                      placeholder="Detail why this award was received, its significance, and operational recognition details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    {editId ? "Save Changes" : "Publish Award"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && selectedAward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10"
            >
              <div className="relative h-64 bg-slate-900">
                {selectedAward.image ? (
                  <img 
                    src={selectedAward.image} 
                    alt={selectedAward.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Trophy className="w-16 h-16 text-slate-600" />
                    <span>No Award Image Displayed</span>
                  </div>
                )}
                
                {/* Close Button */}
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Banner Text overlay */}
                <div className="absolute bottom-6 left-6 right-6 text-white drop-shadow-md">
                  <div className="inline-block bg-emerald-600 text-xs font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md mb-2">
                    Award Credential
                  </div>
                  <h2 className="text-2xl font-bold">{selectedAward.title}</h2>
                  <p className="text-sm opacity-90 mt-1 flex items-center gap-1.5">
                    <span>Issued in {selectedAward.year}</span>
                    <span>•</span>
                    <span>Conferred by {selectedAward.company}</span>
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-5">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">A ward Description</h4>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedAward.description}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Registered ID: {selectedAward.id}</span>
                  <span>Created: {new Date(selectedAward.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
