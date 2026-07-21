import { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { parseTransactionText } from '../lib/gemini';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function AiTransactionInput({ onTransactionAdded }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuthStore();
  const { categories, accounts, addTransaction } = useFinanceStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    if (!accounts || accounts.length === 0) {
      toast.error("Anda belum memiliki akun. Buat akun terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      // 1. Parse text via Gemini
      const result = await parseTransactionText(text, categories, accounts);
      
      // 2. Validate and fill missing fields with defaults
      let finalAmount = result.amount;
      if (!finalAmount || isNaN(finalAmount)) {
        throw new Error("AI gagal menemukan nominal angka transaksi.");
      }

      let categoryId = result.category_id;
      let accountId = result.account_id;
      let type = result.category_type || 'expense';

      // Fallback if category or account missing
      if (!categoryId) {
        const fallbackCat = categories.find(c => c.type === type);
        categoryId = fallbackCat ? fallbackCat.id : '';
      }
      
      if (!accountId) {
        accountId = accounts[0].id;
      }

      // 3. Save to database
      const newTx = {
        user_id: user.id,
        amount: finalAmount,
        type: type,
        category_id: categoryId,
        account_id: accountId,
        description: result.description || 'Transaksi via AI',
        date: result.date || new Date().toISOString().split('T')[0]
      };

      await addTransaction(newTx);
      toast.success('Transaksi ajaib berhasil ditambahkan! ✨');
      setText('');
      if (onTransactionAdded) onTransactionAdded();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal memproses teks.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
      <div 
        style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <Sparkles size={20} />
      </div>
      
      <input
        type="text"
        placeholder="Ketik 'Makan 25rb pakai gopay' lalu enter..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 48px 14px 40px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: '15px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.3s ease',
          outline: 'none'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
        className={loading ? 'skeleton' : ''}
      />
      
      <button 
        type="submit" 
        disabled={loading || !text.trim()}
        className="btn-icon"
        style={{ 
          position: 'absolute', 
          right: '8px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          background: text.trim() ? 'var(--accent-primary)' : 'transparent',
          color: text.trim() ? 'white' : 'var(--text-muted)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '6px',
          cursor: text.trim() ? 'pointer' : 'default',
          transition: 'all 0.2s ease'
        }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
      </button>
    </form>
  );
}
