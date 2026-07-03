import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle,
  Download,
  Barcode,
  Layers,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  X,
  Layers3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useERPStore } from '../../store';
import { Product } from '../../types';
import { toast } from 'sonner';

export const Inventory: React.FC = () => {
  const store = useERPStore();
  const { state, addProduct, updateProduct, deleteProduct } = store;

  const rawProducts = state.products || [];

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');
  
  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formSku, setFormSku] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Derived calculations
  const totalSku = rawProducts.length;
  const lowStockItems = rawProducts.filter(p => p.stock < p.minStockAlert).length;
  const outOfStockItems = rawProducts.filter(p => p.stock <= 0).length;

  // Filters
  const filteredProducts = rawProducts.filter(product => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (activeView === 'low-stock') {
      return product.stock < product.minStockAlert && product.stock > 0;
    } else if (activeView === 'out-of-stock') {
      return product.stock <= 0;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Construction');
    setFormCompanyName('Bashundhara Group');
    setFormBrand('Bashundhara');
    setFormPrice('');
    setFormCostPrice('');
    setFormStock('');
    setFormMinStock('50');
    setFormUnit('Pcs');
    setFormSku(`SKU-${Date.now().toString().slice(-6)}`);
    setFormDescription('');
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormCompanyName(product.companyName || '');
    setFormBrand(product.brand);
    setFormPrice(product.price.toString());
    setFormCostPrice(product.costPrice?.toString() || '');
    setFormStock(product.stock.toString());
    setFormMinStock(product.minStockAlert.toString());
    setFormUnit(product.unit || 'Pcs');
    setFormSku(product.sku);
    setFormDescription(product.description || '');
    setIsAddEditOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) {
      toast.error('Product name and SKU are required.');
      return;
    }

    const parsedPrice = parseFloat(formPrice) || 0;
    const parsedCost = parseFloat(formCostPrice) || 0;
    const parsedStock = parseInt(formStock) || 0;
    const parsedMinStock = parseInt(formMinStock) || 0;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: formName,
        category: formCategory,
        companyName: formCompanyName,
        brand: formBrand,
        price: parsedPrice,
        costPrice: parsedCost,
        stock: parsedStock,
        minStockAlert: parsedMinStock,
        unit: formUnit,
        sku: formSku,
        description: formDescription
      };
      await updateProduct(updated);
      toast.success(`Successfully updated product: ${formName}`);
    } else {
      await addProduct({
        name: formName,
        category: formCategory,
        companyName: formCompanyName,
        brand: formBrand,
        price: parsedPrice,
        costPrice: parsedCost,
        stock: parsedStock,
        minStockAlert: parsedMinStock,
        unit: formUnit,
        sku: formSku,
        description: formDescription,
        active: true
      });
      toast.success(`Successfully registered product: ${formName}`);
    }

    setIsAddEditOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteProduct(id);
      toast.info(`Deleted product ${name}`);
    }
  };

  const handleQuickRestock = (product: Product) => {
    setRestockTarget(product);
    setRestockAmount('');
    setIsRestockOpen(true);
  };

  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    const amount = parseInt(restockAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive quantity to restock.');
      return;
    }

    const updated: Product = {
      ...restockTarget,
      stock: restockTarget.stock + amount
    };
    await updateProduct(updated);
    toast.success(`Restocked ${amount} ${restockTarget.unit || 'units'} of ${restockTarget.name}`);
    setIsRestockOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Name', 'Brand', 'Category', 'Unit Price', 'Cost Price', 'Stock', 'Unit', 'Alert Level'];
    const rows = rawProducts.map(p => [
      p.sku,
      p.name,
      p.brand,
      p.category,
      p.price,
      p.costPrice || 0,
      p.stock,
      p.unit || 'Pcs',
      p.minStockAlert
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lovely_enterprise_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Inventory state exported successfully.');
  };

  return (
    <div id="inventory-page-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory & Stock</h1>
          <p className="text-slate-500 mt-1">Monitor live stock levels, configure alert thresholds, restock wholesale goods, and log product details.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            id="export-inventory-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Download size={18} />
            Export Inventory
          </button>
          <button 
            id="add-product-btn"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm shadow-emerald-200 active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            lowStockItems > 0 ? "bg-amber-50 text-amber-600 animate-pulse" : "bg-slate-50 text-slate-400"
          )}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Low Stock Items</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{lowStockItems} SKUs</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Active SKUs</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalSku} products</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            outOfStockItems > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
          )}>
            <Layers3 size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Out of Stock</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{outOfStockItems} items</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
         <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by product name, SKU, brand, or category..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'low-stock', label: 'Low Stock Alerts' },
              { id: 'out-of-stock', label: 'Out Of Stock' }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                  activeView === view.id 
                    ? "bg-white text-emerald-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Selling Price</th>
                <th className="px-6 py-4 text-right">Cost Price</th>
                <th className="px-6 py-4 text-center">Stock Level</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package size={36} className="text-slate-300" />
                      <p className="font-semibold text-slate-500">No products found</p>
                      <p className="text-xs text-slate-400">Add some retail or wholesale commodities to show here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLow = product.stock < product.minStockAlert;
                  const isOut = product.stock <= 0;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">SKU: {product.sku}</span>
                               {product.brand && (
                                 <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">{product.brand}</span>
                               )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-slate-900">৳ {product.price.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Per {product.unit || 'Unit'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-slate-500">৳ {(product.costPrice || 0).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                           <p className={cn(
                             "text-sm font-black",
                             isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"
                           )}>
                             {product.stock.toLocaleString()} {product.unit || 'pcs'}
                           </p>
                           <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${Math.min((product.stock / Math.max((product.minStockAlert * 2), 1)) * 100, 100)}%` }}
                              />
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isOut ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 uppercase tracking-widest">
                            <AlertTriangle size={12} />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse">
                            <AlertTriangle size={12} />
                            Low Stock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            title="Quick Restock" 
                            onClick={() => handleQuickRestock(product)}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Plus size={18} />
                          </button>
                          <button 
                            title="Edit Product" 
                            onClick={() => handleOpenEdit(product)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            title="Delete SKU" 
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {isAddEditOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingProduct ? `Edit Product: ${editingProduct.sku}` : `Add New Product SKU`}
                </h3>
                <button 
                  onClick={() => setIsAddEditOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Product SKU/Barcode *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g. CMT-BASH-01"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Product Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g. Bashundhara Cement Portland"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Brand</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Bashundhara, BSRM"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Manufacturer / Company</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Bashundhara Group"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formCompanyName}
                      onChange={(e) => setFormCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Category</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      <option value="Construction">Construction</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Masonry">Masonry</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Unit of Measure</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Bag, Ton, Pcs, Feet"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Selling Price (BDT) *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Cost Price (BDT)</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Initial Stock *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="0"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Min stock alert *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="50"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Product Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Enter secondary details, weight, storage recommendations..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsAddEditOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest cursor-pointer shadow-sm shadow-emerald-200"
                  >
                    Save SKU
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK RESTOCK MODAL */}
      <AnimatePresence>
        {isRestockOpen && restockTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-slate-100 shadow-2xl"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Quick Restock</h3>
                <button onClick={() => setIsRestockOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveRestock} className="p-6 space-y-4">
                <div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black uppercase tracking-widest">Active SKU</span>
                  <p className="font-black text-slate-900 mt-1">{restockTarget.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Current Stock: {restockTarget.stock} {restockTarget.unit || 'pcs'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Quantity to Add *</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="Enter addition quantity..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsRestockOpen(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl uppercase cursor-pointer shadow-sm shadow-emerald-200"
                  >
                    Update Stock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
