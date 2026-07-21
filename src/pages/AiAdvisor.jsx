import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, ArrowLeft } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { askFinancialAdvisor } from '../lib/gemini';
import { formatCurrency } from '../lib/utils';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../store/languageStore';
import './AiAdvisor.css';

// Configure marked to not sanitize, we'll use DOMPurify
marked.setOptions({
  breaks: true,
  gfm: true
});

export default function AiAdvisor() {
  const { user } = useAuthStore();
  const { accounts, transactions, aiPersonality } = useFinanceStore();
  const { t, language } = useLanguageStore();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('financeme-advisor-chat');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    // We can't easily translate initial message if we load from localStorage, but let's use t() for fallback
    return [
      { role: 'model', text: t('advisor.welcome') }
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
    if (window.confirm(t('advisor.clearConfirm'))) {
      const init = [{ role: 'model', text: t('advisor.cleared') }];
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
      const historyToSend = newMessages.filter(m => 
        m.text !== t('advisor.welcome') && 
        m.text !== 'Halo! Saya Asisten AI FinanceMe. Ada yang bisa saya bantu terkait keuangan Anda hari ini?'
      );
      
      const aiResponse = await askFinancialAdvisor(historyToSend, userMsg, contextData, language, aiPersonality);
      
      setMessages([...newMessages, { role: 'model', text: aiResponse }]);
    } catch (error) {
      toast.error(error.message);
      setMessages([...newMessages, { role: 'model', text: t('advisor.error') }]);
    } finally {
      setLoading(false);
    }
  };

  const personalityIcons = {
    professional: '👔',
    roast: '🔥',
    zen: '🧘'
  };

  const personalityLabels = {
    professional: t('settings.aiPro') || 'Profesional',
    roast: 'Roast Mode',
    zen: 'Zen Mode'
  };

  return (
    <div className="advisor-page animate-fade-in">
      <div className="advisor-header">
        <button 
          className="btn btn-icon btn-ghost" 
          onClick={() => navigate(-1)} 
          style={{ marginRight: '8px' }}
          title={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="advisor-avatar" style={{ backgroundColor: aiPersonality === 'roast' ? '#ef4444' : aiPersonality === 'zen' ? '#10b981' : '#6366f1' }}>
          <Bot size={24} color="white" />
        </div>
        <div className="advisor-title-area">
          <h1 className="advisor-title">
            {t('advisor.title')}
            <span style={{ fontSize: '14px', marginLeft: '8px' }} title={`Mode: ${personalityLabels[aiPersonality]}`}>
              {personalityIcons[aiPersonality]}
            </span>
          </h1>
          <p className="advisor-subtitle">{t('advisor.subtitle')}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-icon btn-ghost" onClick={handleClear} title={t('advisor.clearChat')} disabled={messages.length <= 1}>
            <Trash2 size={18} />
          </button>
        </div>
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
