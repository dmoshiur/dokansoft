import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  User, 
  ShoppingBag, 
  Percent, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { FullState, Customer, Product, Invoice, InvoiceItem } from '../../types';

interface BillingProps {
  state: FullState;
  onSaveInvoice: (invoice: Omit<Invoice, 'id' | 'timestamp'>) => Promise<string | undefined>;
}

export const Billing: React.FC<BillingProps> = ({ state, onSaveInvoice }) => {
  const { customers, products, config } = state;

  // Active form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);

  // Selected product state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);

  // Invoice Items
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  // Post-submission state
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.filter(c => c.status === 'ACTIVE');
    const query = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.status === 'ACTIVE' &&
      (c.name.toLowerCase().includes(query) || 
       (c.phone && c.phone.includes(query)) ||
       c.id.toLowerCase().includes(query))
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Set unit price when product selection changes
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setItemUnitPrice(prod.price);
    }
  };

  // Add item to invoice table
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedProduct) {
      setAlertMsg({ type: 'error', text: 'Please select a product first.' });
      return;
    }
    if (itemQuantity <= 0) {
      setAlertMsg({ type: 'error', text: 'Quantity must be at least 1.' });
      return;
    }

    // Check if product already exists in invoice items
    const existingIndex = invoiceItems.findIndex(item => item.productId === selectedProductId);
    if (existingIndex > -1) {
      const updated = [...invoiceItems];
      const newQty = updated[existingIndex].quantity + itemQuantity;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        totalPrice: newQty * updated[existingIndex].unitPrice
      };
      setInvoiceItems(updated);
    } else {
      const newItem: InvoiceItem = {
        productId: selectedProductId,
        productName: selectedProduct.name,
        quantity: itemQuantity,
        unitPrice: itemUnitPrice,
        totalPrice: itemQuantity * itemUnitPrice
      };
      setInvoiceItems([...invoiceItems, newItem]);
    }

    // Reset item input fields
    setSelectedProductId('');
    setItemQuantity(1);
    setItemUnitPrice(0);
    setAlertMsg(null);
  };

  // Remove item from list
  const handleRemoveItem = (index: number) => {
    const updated = [...invoiceItems];
    updated.splice(index, 1);
    setInvoiceItems(updated);
  };

  // Calculate invoice sums
  const subtotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [invoiceItems]);

  const finalTotal = useMemo(() => {
    const total = subtotal - discountAmount;
    return total < 0 ? 0 : total;
  }, [subtotal, discountAmount]);

  // Handle invoice submission and save
  const handleSaveInvoice = async () => {
    if (!selectedCustomerId || !selectedCustomer) {
      setAlertMsg({ type: 'error', text: 'Please select a valid customer.' });
      return;
    }
    if (invoiceItems.length === 0) {
      setAlertMsg({ type: 'error', text: 'Please add at least one product to the memo.' });
      return;
    }

    setIsSubmitting(true);
    setAlertMsg(null);

    const invoicePayload = {
      customerId: selectedCustomerId,
      customerName: selectedCustomer.name,
      items: invoiceItems,
      subtotal,
      discount: discountAmount,
      total: finalTotal,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      const newId = await onSaveInvoice(invoicePayload);
      if (newId) {
        setSavedInvoice({
          ...invoicePayload,
          id: newId,
          timestamp: new Date().toLocaleTimeString()
        });
        setAlertMsg({ type: 'success', text: `Memo #${newId} saved successfully & synchronized to MongoDB.` });
        
        // Clear active form
        setInvoiceItems([]);
        setDiscountAmount(0);
        setSelectedCustomerId('');
        setCustomerSearch('');
      } else {
        setAlertMsg({ type: 'error', text: 'Failed to persist memo to database.' });
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSelectedCustomerId('');
    setCustomerSearch('');
    setInvoiceItems([]);
    setDiscountAmount(0);
    setSelectedProductId('');
    setItemQuantity(1);
    setItemUnitPrice(0);
    setSavedInvoice(null);
    setAlertMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Printable Area - Hidden on Screen */}
      {savedInvoice && (
        <div className="hidden print:block print:p-8 bg-white text-black font-sans w-full text-xs">
          <div className="text-center border-b pb-4 mb-4">
            <h1 className="text-xl font-bold uppercase">{config.shopName}</h1>
            <p className="text-[10px] text-slate-500">{config.address}</p>
            <p className="text-[10px] text-slate-500">Phones: {config.phoneNumbers.join(', ')}</p>
            <p className="text-sm font-bold tracking-widest uppercase mt-2">CASH MEMO / INVOICE</p>
          </div>
          
          <div className="flex justify-between mb-4">
            <div>
              <p className="font-bold">BILLED TO:</p>
              <p className="font-bold text-sm">{savedInvoice.customerName}</p>
              {selectedCustomer && (
                <>
                  <p>Phone: {selectedCustomer.phone}</p>
                  <p>Address: {selectedCustomer.address}</p>
                  <p>Area: {selectedCustomer.area || 'N/A'}</p>
                </>
              )}
            </div>
            <div className="text-right">
              <p><span className="font-bold">Invoice ID:</span> {savedInvoice.id}</p>
              <p><span className="font-bold">Date:</span> {savedInvoice.date}</p>
              <p><span className="font-bold">Time:</span> {savedInvoice.timestamp}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-slate-300 mt-4">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold">
                <th className="p-2 border-r border-slate-300">#</th>
                <th className="p-2 border-r border-slate-300">Product / Item</th>
                <th className="p-2 text-center border-r border-slate-300">Qty</th>
                <th className="p-2 text-right border-r border-slate-300">Rate</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {savedInvoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-300 text-[10px]">
                  <td className="p-2 border-r border-slate-300">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-bold">{item.productName}</td>
                  <td className="p-2 text-center border-r border-slate-300">{item.quantity}</td>
                  <td className="p-2 text-right border-r border-slate-300">{item.unitPrice.toLocaleString()} BDT</td>
                  <td className="p-2 text-right font-bold">{item.totalPrice.toLocaleString()} BDT</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <div className="w-64 space-y-1.5 text-right text-[10px]">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-bold">Subtotal:</span>
                <span className="font-bold">{savedInvoice.subtotal.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-bold">Discount:</span>
                <span className="font-bold text-rose-600">-{savedInvoice.discount.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between text-xs font-black bg-slate-100 p-1 rounded">
                <span>Grand Total:</span>
                <span className="text-emerald-700">{savedInvoice.total.toLocaleString()} BDT</span>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-between text-[10px] pt-8 border-t border-slate-200">
            <div className="text-center w-36">
              <div className="border-t border-black/30 pt-1">Customer Signature</div>
            </div>
            <div className="text-center w-36">
              <div className="border-t border-black/30 pt-1">Authorized Seal</div>
            </div>
          </div>
        </div>
      )}

      {/* Screen Interface */}
      <div className="flex flex-col xl:flex-row gap-6 print:hidden">
        
        {/* Left Form Panel: Selector and Builder */}
        <div className="flex-1 space-y-6">
          
          {/* Section 1: Select Customer */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Select Billed Customer</h3>
                <p className="text-slate-500 text-[10px]">Find corporate customer to map this credit ledger purchase memo</p>
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Search & Choose Customer</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder={selectedCustomer ? selectedCustomer.name : "Type customer name or phone number..."}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-800"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                />
                {selectedCustomerId && (
                  <button 
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerSearch('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Customer Select Dropdown list */}
              {isCustomerDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">No active customers found.</div>
                  ) : (
                    filteredCustomers.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setCustomerSearch(cust.name);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{cust.name}</p>
                          <p className="text-[10px] text-slate-500">{cust.phone || 'No phone'} | {cust.address}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-rose-500">{(cust.dueAmount || 0).toLocaleString()} BDT Due</p>
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider">{cust.area || 'No Area'}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Customer Card Preview */}
            <AnimatePresence>
              {selectedCustomer && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Active Billing Profile</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedCustomer.name}</p>
                    <p className="text-slate-500">{selectedCustomer.phone}</p>
                    <p className="text-slate-500">{selectedCustomer.address}</p>
                  </div>
                  <div className="text-right space-y-1 text-xs">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Live Outstanding Balance</p>
                    <p className="font-black text-rose-600 text-base">{(selectedCustomer.dueAmount || 0).toLocaleString()} BDT</p>
                    <p className="text-slate-500 text-[10px]">Area ID: <span className="font-bold text-slate-700">{selectedCustomer.area || 'N/A'}</span></p>
                    <p className="text-slate-500 text-[10px]">Serial No: <span className="font-bold text-slate-700">{selectedCustomer.serialNumber || 'N/A'}</span></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 2: Product Addition Selector */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Add Items & Products</h3>
                <p className="text-slate-500 text-[10px]">Select product inventory item to load details and pricing</p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Catalog</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium"
                >
                  <option value="">-- Choose Inventory Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku} | Stock: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Rate (BDT)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                  value={itemUnitPrice}
                  onChange={(e) => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Quantity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-center"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </form>

            {/* Product stock/price warning indicator */}
            {selectedProduct && (
              <div className="flex items-center gap-2 text-xs bg-slate-50 px-4 py-2 rounded-xl text-slate-600">
                <AlertTriangle className={cn("w-4 h-4", selectedProduct.stock < itemQuantity ? "text-amber-500" : "text-emerald-500")} size={16} />
                <p>
                  Available Stock: <span className="font-bold text-slate-800">{selectedProduct.stock} {selectedProduct.unit}</span>. 
                  {selectedProduct.stock < itemQuantity && (
                    <span className="text-amber-600 font-bold ml-1">Warning: Selected quantity exceeds stock.</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Current Memo Item Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Cash Memo Items List</h4>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px]">{invoiceItems.length} Products Added</span>
            </div>
            
            {invoiceItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-600">Cash Memo is Empty</p>
                <p className="text-[10px] mt-1">Please select products from inventory above to add them to this billing sheet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3 text-center">Qty</th>
                      <th className="px-6 py-3 text-right">Unit Rate</th>
                      <th className="px-6 py-3 text-right">Total Price</th>
                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {invoiceItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{item.productName}</td>
                        <td className="px-6 py-4 text-center font-bold">{item.quantity}</td>
                        <td className="px-6 py-4 text-right">{item.unitPrice.toLocaleString()} BDT</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-700">{item.totalPrice.toLocaleString()} BDT</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg hover:text-rose-700 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Summary Panel: Calculations and Save Action */}
        <div className="w-full xl:w-96 space-y-6">
          
          {/* Summary / Calculation Sheet */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Percent size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Memo Summary</h3>
                <p className="text-slate-500 text-[10px]">Verify totals, apply discounts and finalize memo entries</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Items Count:</span>
                <span className="font-bold text-slate-800">{invoiceItems.length} products</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Subtotal:</span>
                <span className="font-bold text-slate-800">{subtotal.toLocaleString()} BDT</span>
              </div>
              
              {/* Discount Entry */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Apply Custom Discount (BDT)</label>
                <div className="relative">
                  <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    placeholder="Discount amount in BDT..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 text-right"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 pt-3 mt-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Final Memo Due</p>
                  <p className="text-[8px] text-slate-500 font-medium">To be debited from customer account</p>
                </div>
                <p className="text-xl font-black text-emerald-700">{finalTotal.toLocaleString()} BDT</p>
              </div>
            </div>

            {/* Form actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting || invoiceItems.length === 0 || !selectedCustomerId}
                onClick={handleSaveInvoice}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer text-white transition-all shadow-md",
                  (invoiceItems.length === 0 || !selectedCustomerId) 
                    ? "bg-slate-300 shadow-none cursor-not-allowed" 
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 hover:scale-102"
                )}
              >
                <Save size={16} />
                {isSubmitting ? 'Syncing to DB...' : 'Save & Sync Invoice'}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                Reset Sheet
              </button>
            </div>

            {/* Notification alert banner */}
            {alertMsg && (
              <div className={cn(
                "p-4 rounded-xl text-xs font-semibold flex items-start gap-2",
                alertMsg.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-rose-50 text-rose-800 border border-rose-100"
              )}>
                {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                <p>{alertMsg.text}</p>
              </div>
            )}
          </div>

          {/* Cash Receipt Print Preview Panel */}
          <AnimatePresence>
            {savedInvoice && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 relative overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h4 className="font-extrabold text-sm flex items-center gap-1.5"><FileText size={16} className="text-emerald-500 animate-pulse" /> Cash Receipt Saved</h4>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Printer size={12} />
                    Print Receipt
                  </button>
                </div>

                <div className="font-mono text-[10px] space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5 text-slate-300">
                  <p className="font-bold border-b border-white/10 pb-1 text-white">MEMO DETAILS</p>
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span className="font-bold text-emerald-400">{savedInvoice.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billed To:</span>
                    <span className="font-bold text-white">{savedInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{savedInvoice.subtotal.toLocaleString()} BDT</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Discount:</span>
                    <span>-{savedInvoice.discount.toLocaleString()} BDT</span>
                  </div>
                  <div className="flex justify-between font-black border-t border-white/10 pt-1 text-emerald-400">
                    <span>Grand Total:</span>
                    <span>{savedInvoice.total.toLocaleString()} BDT</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center italic">Ready for printing on any default local or thermal standard device.</p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};
