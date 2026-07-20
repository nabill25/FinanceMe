import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { askFinancialAdvisor } from '../lib/gemini';
import { formatCurrency } from '../lib/utils';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import './AiAdvisor.css';

// Configure marked to not sanitize, we'll use DOMPurify
marked.setOptions({
  breaks: true,
  gfm: true
});

export default function AiAdvisor() {
  const { user } = useAuthStore();
  const { accounts, transactions } = useFinanceStore();
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('financeme-advisor-chat');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      { role: 'model', text: 'Halo! Saya Asisten AI FinanceMe. Ada yang bisa saya bantu terkait keuangan Anda hari ini?' }
    ];
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem('financeme-advisor-chat', JSON.stringify(messages));
  }, [messages]);

  const handleClear = () => {
    if (window.confirm('Hapus semua riwayat percakapan?')) {
      const init = [{ role: 'model', text: 'Riwayat percakapan telah dihapus. Apa yang ingin Anda diskusikan sekarang?' }];
      setMessages(init);
      localStorage.setItem('financeme-advisor-chat', JSON.stringify(init));
    }
  };

  const getFinancialContext = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    
    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const recent = transactions.slice(0, 10).map(t => 
      `- ${t.date} | ${t.type.toUpperCase()} | ${formatCurrency(t.amount)} | ${t.description}`
    ).join('\n');

    return {
      totalBalance: formatCurrency(totalBalance),
      accountCount: accounts.length,
      currentMonthTxCount: currentMonthTx.length,
      currentMonthIncome: formatCurrency(income),
      currentMonthExpense: formatCurrency(expense),
      recentTransactions: recent
    };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    
    // Optimistic UI
    const newMessages = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const contextData = getFinancialContext();
      // Filter out the initial welcome message from history sent to AI if it's the default one
      const historyToSend = newMessages.filter(m => m.text !== 'Halo! Saya Asisten AI FinanceMe. Ada yang bisa saya bantu terkait keuangan Anda hari ini?');
      
      const reply = await askFinancialAdvisor(historyToSend, userMsg, contextData);
      
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (error) {
      toast.error(error.message);
      // Remove the user message if failed? Or just show error.
      setMessages(prev => [...prev, { role: 'model', text: '⚠️ Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="advisor-page animate-fade-in">
      <div className="advisor-header">
        <div className="advisor-avatar">
          <Bot size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="advisor-title">Asisten Keuangan AI</h1>
          <p className="advisor-subtitle">Didukung oleh Gemini</p>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={handleClear} title="Hapus Obrolan">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="advisor-chat-area">
        {messages.map((msg, idx) => (
          <div key={idx} className={`advisor-message ${msg.role}`}>
            <div className="advisor-bubble"
              dangerouslySetInnerHTML={{
                __html: msg.role === 'model' 
                  ? DOMPurify.sanitize(marked.parse(msg.text))
                  : DOMPurify.sanitize(msg.text) // Plain text for user
              }}
            />
          </div>
        ))}
        {loading && (
          <div className="advisor-message model">
            <div className="advisor-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="advisor-input-area" onSubmit={handleSend}>
        <input
          type="text"
          className="advisor-input"
          placeholder="Tanya tentang keuangan Anda..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="advisor-send-btn" disabled={!input.trim() || loading}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
