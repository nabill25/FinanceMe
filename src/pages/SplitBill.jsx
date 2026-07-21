import { useState, useRef, useEffect } from 'react';
import { Camera, Plus, Trash2, Users, Loader2, Share2, Check, ArrowLeft, Scissors } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useLanguageStore } from '../store/languageStore';
import { scanReceipt } from '../lib/gemini';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import BottomSheet from '../components/BottomSheet';
import './SplitBill.css';

export default function SplitBill() {
  const { categories, paymentInfo } = useFinanceStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  
  const [scanning, setScanning] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  
  // Data State
  const [totalBill, setTotalBill] = useState(0);
  const [items, setItems] = useState([]); // { id, name, amount, assignees: [] }
  const [people, setPeople] = useState([]); // { id, name }
  const [newPersonName, setNewPersonName] = useState('');
  
  // UI State
  const [selectedItem, setSelectedItem] = useState(null); // the item currently being edited/assigned in BottomSheet
  
  const fileInputRef = useRef(null);

  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      toast.error('API Key Gemini belum diatur (VITE_GEMINI_API_KEY)');
      return;
    }

    try {
      setScanning(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        try {
          const result = await scanReceipt(base64String, file.type, categories);
          
          setTotalBill(result.amount || 0);
          
          if (result.items && Array.isArray(result.items) && result.items.length > 0) {
            const parsedItems = result.items.map((item, index) => ({
              id: Date.now().toString() + index,
              name: item.name,
              amount: item.amount,
              assignees: [] // array of person IDs
            }));
            setItems(parsedItems);
            toast.success(`AI berhasil mengekstrak ${result.items.length} menu dari struk!`);
          } else {
            toast.warning('AI tidak dapat menemukan rincian pesanan pada struk ini.');
          }
        } catch (err) {
          toast.error(err.message || 'Gagal memindai struk.');
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Gagal membaca file gambar');
      setScanning(false);
    }
  };

  const handleAddPerson = (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    
    // Check duplicate
    if (people.some(p => p.name.toLowerCase() === newPersonName.trim().toLowerCase())) {
      toast.error('Nama sudah ada');
      return;
    }

    setPeople([...people, { id: Date.now().toString(), name: newPersonName.trim() }]);
    setNewPersonName('');
  };

  const handleRemovePerson = (personId) => {
    setPeople(people.filter(p => p.id !== personId));
    // Remove person from all items
    setItems(items.map(item => ({
      ...item,
      assignees: item.assignees.filter(id => id !== personId)
    })));
  };

  const toggleAssignee = (itemId, personId) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const isAssigned = item.assignees.includes(personId);
        return {
          ...item,
          assignees: isAssigned 
            ? item.assignees.filter(id => id !== personId)
            : [...item.assignees, personId]
        };
      }
      return item;
    }));
  };

  const handleAddManualItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: 'Item Manual',
      amount: 0,
      assignees: []
    };
    setItems([...items, newItem]);
    setSelectedItem(newItem); // open edit sheet immediately
  };

  const handleSaveItemEdit = (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    setItems(items.map(item => item.id === selectedItem.id ? selectedItem : item));
    setSelectedItem(null);
  };

  // Calculations
  const subtotalItems = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAndService = Math.max(0, totalBill - subtotalItems);
  const allocatedItems = items.reduce((sum, item) => item.assignees.length > 0 ? sum + item.amount : sum, 0);
  const unallocatedAmount = Math.max(0, subtotalItems - allocatedItems);

  const getPersonTotal = (personId) => {
    let personSubtotal = 0;
    
    // Calculate sum of items ordered by this person
    items.forEach(item => {
      if (item.assignees.includes(personId)) {
        // If multiple people ordered it, split the cost evenly
        personSubtotal += (item.amount / item.assignees.length);
      }
    });

    // Calculate proportional tax for this person
    // Formula: (Person's Subtotal / Total Items Subtotal) * Total Tax
    const personTax = subtotalItems > 0 
      ? (personSubtotal / subtotalItems) * taxAndService
      : 0;
      
    return {
      subtotal: personSubtotal,
      tax: personTax,
      total: personSubtotal + personTax,
      items: items.filter(item => item.assignees.includes(personId)).map(item => ({
        ...item,
        splitAmount: item.amount / item.assignees.length
      }))
    };
  };

  const handleShare = async (person) => {
    const personData = getPersonTotal(person.id);
    
    if (personData.total === 0) {
      toast.error('Belum ada pesanan untuk ' + person.name);
      return;
    }

    let itemsText = personData.items.map(item => {
      const shareIndicator = item.assignees.length > 1 ? ` (dibagi ${item.assignees.length})` : '';
      return `- ${item.name}: Rp ${item.splitAmount.toLocaleString('id-ID')}${shareIndicator}`;
    }).join('\n');

    let rawMsg = t('splitBill.shareMsg');
    
    // Replace placeholders
    let msg = rawMsg
      .replace('{name}', person.name)
      .replace('{items}', itemsText)
      .replace('{tax}', `Rp ${personData.tax.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`)
      .replace('{total}', `Rp ${Math.round(personData.total).toLocaleString('id-ID')}`)
      .replace('{paymentInfo}', paymentInfo || '-');
      
    // Unescape newlines for actual text
    msg = msg.replace(/\\n/g, '\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Split Bill',
          text: msg
        });
      } else {
        await navigator.clipboard.writeText(msg);
        toast.success(t('splitBill.copied') || 'Teks disalin!');
        
        // Open WA Web in fallback
        const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
      }
    } catch (err) {
      // Fallback
      await navigator.clipboard.writeText(msg);
      toast.success(t('splitBill.copied') || 'Teks disalin!');
    }
  };

  return (
    <>
      <div className="split-bill-container animate-fade-in pb-24">
      <header className="page-header">
        <div className="page-title-group">
          <button 
            className="btn btn-icon btn-ghost d-md-none" 
            onClick={() => navigate(-1)} 
            style={{ marginRight: '8px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="page-icon-box" style={{ background: 'var(--accent-color)' }}>
            <Scissors size={24} color="white" />
          </div>
          <div>
            <h1 className="page-title">{t('splitBill.title') || 'Patungan Cerdas'}</h1>
            <p className="page-subtitle">{t('splitBill.subtitle') || 'Foto struk, bagi tagihan otomatis'}</p>
          </div>
        </div>
      </header>

      <div className="split-bill-grid">
        {/* Left Column: Receipt & Items */}
        <div className="split-bill-left">
          <div className="card">
            <div className="card-body">
              {!receiptPreview ? (
                <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                  <div className="upload-icon">
                    <Camera size={32} />
                  </div>
                  <h3>AI Scan Struk</h3>
                  <p className="text-sm text-muted">Unggah foto struk, AI akan memecah daftar pesanan otomatis</p>
                </div>
              ) : (
                <div className="receipt-preview-container">
                  <img src={receiptPreview} alt="Receipt" className="receipt-preview-img" />
                  <button 
                    className="btn btn-secondary btn-sm change-receipt-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={scanning}
                  >
                    <Camera size={16} /> Ganti Struk
                  </button>
                </div>
              )}
              <input 
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleScan}
              />
            </div>
          </div>

          {scanning && (
            <div className="scanning-indicator">
              <Loader2 className="spinner-icon" size={24} />
              <p>{t('splitBill.scanning') || 'AI Sedang Membaca...'}</p>
            </div>
          )}

          {!scanning && items.length > 0 && (
            <div className="card items-card animate-slide-up">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">{t('splitBill.items') || 'Rincian Pesanan'} <span className="badge badge-primary">{items.length} item</span></h3>
                <button className="btn btn-outline btn-sm" onClick={handleAddManualItem}>
                  <Plus size={16} /> Tambah Manual
                </button>
              </div>
              <div className="card-body p-0">
                <div className="items-list">
                  {items.map(item => (
                    <div key={item.id} className="bill-item clickable" onClick={() => setSelectedItem(item)}>
                      <div className="bill-item-info">
                        <div className="bill-item-name">{item.name}</div>
                        <div className="bill-item-price">{formatCurrency(item.amount)}</div>
                      </div>
                      <div className="bill-item-assignees">
                        {item.assignees.length === 0 ? (
                          <span className="text-sm text-muted" style={{ fontStyle: 'italic' }}>
                            Belum ditugaskan
                          </span>
                        ) : (
                          <div className="assignee-bubbles">
                            {item.assignees.map(personId => {
                              const p = people.find(x => x.id === personId);
                              if (!p) return null;
                              return (
                                <div key={p.id} className="assignee-bubble active" title={p.name}>
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bill-summary-list">
                  <div className="bill-summary-row text-muted">
                    <span>{t('splitBill.subtotal') || 'Subtotal'}</span>
                    <span>{formatCurrency(subtotalItems)}</span>
                  </div>
                  <div className="bill-summary-row text-muted">
                    <span>{t('splitBill.tax') || 'Pajak & Layanan'}</span>
                    <span>{formatCurrency(taxAndService)}</span>
                  </div>
                  <div className="bill-summary-row fw-bold total-row">
                    <span>{t('splitBill.totalBill') || 'Total Struk'}</span>
                    <span>{formatCurrency(totalBill)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!scanning && receiptPreview && items.length === 0 && (
            <div className="empty-state card p-4 text-center">
              <p className="text-muted">{t('splitBill.empty') || 'Belum ada data. Silakan unggah struk terlebih dahulu.'}</p>
            </div>
          )}
        </div>

        {/* Right Column: People & Splitting */}
        <div className="split-bill-right">
          <div className="card people-card">
            <div className="card-header">
              <h3 className="card-title">{t('splitBill.friends') || 'Teman'}</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddPerson} className="add-person-form">
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('splitBill.friendName') || 'Nama teman...'}
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  maxLength={15}
                />
                <button type="submit" className="btn btn-primary btn-icon" disabled={!newPersonName.trim()}>
                  <Plus size={20} />
                </button>
              </form>

              {people.length > 0 ? (
                <div className="people-list">
                  {people.map(person => {
                    const { total, subtotal, tax } = getPersonTotal(person.id);
                    return (
                      <div key={person.id} className="person-card">
                        <div className="person-header">
                          <div className="person-avatar">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="person-info">
                            <h4>{person.name}</h4>
                            <div className="person-total">{formatCurrency(total)}</div>
                          </div>
                          <button 
                            className="btn btn-icon btn-ghost btn-sm text-danger" 
                            onClick={() => handleRemovePerson(person.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="person-details text-xs text-muted">
                          Menu: {formatCurrency(subtotal)} | {t('splitBill.taxProportional') || 'Pajak (Proporsional)'}: {formatCurrency(tax)}
                        </div>
                        
                        <button 
                          className="btn btn-secondary btn-sm w-100 share-btn"
                          onClick={() => handleShare(person)}
                          disabled={total === 0}
                        >
                          <Share2 size={16} /> {t('splitBill.share') || 'Kirim (WA)'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-people">
                  <Users size={32} className="text-muted" />
                  <p className="text-muted text-sm mt-2">Belum ada teman. Tambahkan teman untuk mulai membagi tagihan.</p>
                </div>
              )}
              
              {items.length > 0 && (
                <div className="allocation-summary mt-4">
                  <div className="allocation-progress">
                    <div 
                      className="allocation-bar" 
                      style={{ width: `${(allocatedItems / subtotalItems) * 100}%` }}
                    ></div>
                  </div>
                  <div className="allocation-text text-xs text-muted flex-between">
                    <span>{t('splitBill.totalAllocated') || 'Total Dibagikan'}: {formatCurrency(allocatedItems)}</span>
                    <span className={unallocatedAmount > 0 ? 'text-warning' : ''}>
                      {unallocatedAmount > 0 ? `${t('splitBill.unallocated') || 'Belum Dibagikan'}: ${formatCurrency(unallocatedAmount)}` : '✅'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Edit & Assign Item BottomSheet */}
      <BottomSheet isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Edit & Tugaskan">
        {selectedItem && (
          <div className="modal-body" style={{ padding: 0 }}>
            <form onSubmit={handleSaveItemEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Menu</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={selectedItem.name} 
                  onChange={e => setSelectedItem({...selectedItem, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Harga (Rp)</label>
                <input 
                  type="number" 
                  min="0"
                  className="form-input" 
                  value={selectedItem.amount} 
                  onChange={e => setSelectedItem({...selectedItem, amount: Number(e.target.value)})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Ditugaskan Kepada (Siapa yang makan?)</label>
                {people.length === 0 ? (
                  <div className="text-muted text-sm p-3" style={{ background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                    Belum ada teman. Tambahkan teman di menu sebelah kanan / bawah terlebih dahulu.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {people.map(person => (
                      <label key={person.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedItem.assignees.includes(person.id)}
                          onChange={() => {
                            const isAssigned = selectedItem.assignees.includes(person.id);
                            setSelectedItem({
                              ...selectedItem,
                              assignees: isAssigned 
                                ? selectedItem.assignees.filter(id => id !== person.id)
                                : [...selectedItem.assignees, person.id]
                            });
                          }}
                          style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }}
                        />
                        <div style={{ flex: 1, fontWeight: '500' }}>{person.name}</div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: 0, margin: 0, border: 'none' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedItem(null)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
