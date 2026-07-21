export const translations = {
  id: {
    // Navigation
    nav: {
      dashboard: 'Beranda',
      transactions: 'Transaksi',
      savings: 'Tabungan',
      goals: 'Target',
      reports: 'Laporan',
      forecast: 'Proyeksi',
      advisor: 'Asisten AI',
      decision: 'Cek Pembelian',
      settings: 'Pengaturan',
      logout: 'Keluar',
      login: 'Masuk'
    },
    // Common
    common: {
      income: 'Pemasukan',
      expense: 'Pengeluaran',
      balance: 'Saldo',
      save: 'Simpan',
      cancel: 'Batal',
      delete: 'Hapus',
      edit: 'Edit',
      add: 'Tambah',
      date: 'Tanggal',
      amount: 'Jumlah',
      category: 'Kategori',
      account: 'Akun',
      description: 'Deskripsi',
      tags: 'Tag',
      month: 'Bulan',
      all: 'Semua',
      loading: 'Memuat...',
      success: 'Berhasil',
      error: 'Error'
    },
    // Settings
    settings: {
      title: 'Pengaturan',
      subtitle: 'Kelola preferensi dan batas pengeluaran',
      spendingGuard: 'Spending Guard — Batas Pengeluaran',
      spendingGuardDesc: 'Tetapkan batas pengeluaran harian/mingguan. Jika batas terlampaui, transaksi baru akan diblokir.',
      active: 'Aktifkan Spending Guard',
      limitAmount: 'Batas Pengeluaran',
      period: 'Periode Batas',
      daily: 'Harian',
      weekly: 'Mingguan',
      cooldown: 'Durasi Blokir (Cooldown)',
      hours: 'Jam',
      days: 'Hari',
      appearance: 'Tampilan & Tema',
      appearanceDesc: 'Sesuaikan warna dan tema aplikasi.',
      languageDesc: 'Pilih bahasa antarmuka aplikasi.',
      selectLanguage: 'Pilih Bahasa',
      indonesian: 'Bahasa Indonesia',
      english: 'English',
      aiPersonality: 'Kepribadian Asisten AI',
      aiPersonalityDesc: 'Pilih gaya bahasa yang digunakan oleh Asisten AI Gemini saat merespons pertanyaan Anda.',
      selectAiPersonality: 'Pilih Kepribadian',
      aiPro: 'Profesional & Ramah (Default)',
      aiRoast: 'Roast Mode (Galak & Sarkas)',
      aiZen: 'Zen Mode (Suportif & Sabar)',
      blocked: 'Transaksi Diblokir Sementara',
      blockedDesc: 'Batas terlampaui. Coba lagi dalam:',
      warning: 'Mendekati Batas Pengeluaran!',
      ok: 'Pengeluaran Terkontrol',
      used: 'Terpakai'
    },
    // Quick Add
    quickAdd: {
      title: 'Catat Transaksi',
      scanReceipt: 'Scan Struk (AI)',
      takePhoto: 'Ambil Foto',
      uploadImage: 'Unggah Gambar',
      guessCategory: 'Tebak Kategori dengan AI',
      overBudget: 'Over Budget!',
      transfer: 'Transfer Antar Akun',
      fromAccount: 'Dari Akun',
      toAccount: 'Ke Akun',
      fee: 'Biaya Admin (Opsional)',
      transferSuccess: 'Transfer berhasil dicatat'
    },
    // Transactions
    transactions: {
      title: 'Riwayat Transaksi',
      subtitle: 'Kelola catatan keuangan Anda',
      search: 'Cari transaksi...',
      noTransactions: 'Belum ada transaksi di bulan ini',
      emptySearch: 'Tidak ada transaksi yang cocok'
    },
    // Reports
    reports: {
      title: 'Laporan',
      subtitle: 'Analisis keuangan Anda',
      downloadPdf: 'Download PDF',
      totalIncome: 'Total Pemasukan',
      totalExpense: 'Total Pengeluaran',
      expenseByCategory: 'Pengeluaran per Kategori',
      noExpenseData: 'Tidak ada data pengeluaran',
      trend: 'Tren 6 Bulan Terakhir',
      breakdown: 'Rincian per Kategori',
      aiHabits: 'Analisis Kebiasaan Belanja AI',
      analyzeMonth: 'Analisis Bulan Ini',
      analyzing: 'Membaca pola kebiasaan belanja Anda...',
      reAnalyze: 'Analisis Ulang',
      habitDesc: 'Klik tombol di atas untuk mendapatkan wawasan tentang pola pengeluaran Anda bulan ini dibandingkan 5 bulan terakhir.'
    },
    // Forecast
    forecast: {
      title: 'Proyeksi Keuangan',
      subtitle: 'Prediksi pengeluaran hingga akhir bulan',
      dailyAvg: 'Rata-rata Pengeluaran Harian',
      dailyAvgSub: 'Berdasarkan hari yang telah berlalu',
      prediction: 'Prediksi Akhir Bulan',
      predictionSub: 'Jika kecepatan pengeluaran dipertahankan',
      safeDeficit: 'Sisa Aman / Defisit',
      safeDeficitSub: 'Pemasukan dikurangi prediksi pengeluaran',
      aiInsight: 'AI Insight & Peringatan Dini',
      analyzing: 'Menganalisis pola pengeluaran Anda...'
    },
    // AiAdvisor
    advisor: {
      title: 'Asisten Keuangan AI',
      subtitle: 'Didukung oleh Gemini',
      clearChat: 'Hapus Obrolan',
      inputPlaceholder: 'Tanya tentang keuangan Anda...',
      clearConfirm: 'Hapus semua riwayat percakapan?',
      cleared: 'Riwayat percakapan telah dihapus. Apa yang ingin Anda diskusikan sekarang?',
      welcome: 'Halo! Saya Asisten AI FinanceMe. Ada yang bisa saya bantu terkait keuangan Anda hari ini?',
      error: 'Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi.'
    },
    // Decision Maker
    decision: {
      title: 'Kalkulator Keputusan AI',
      subtitle: 'Minta saran AI sebelum membeli barang impian',
      itemName: 'Nama Barang',
      itemPrice: 'Harga Barang',
      urgency: 'Tingkat Urgensi (1-10)',
      urgencyDesc: '1 = Sangat tidak butuh, 10 = Sangat mendesak',
      reason: 'Alasan Membeli',
      check: 'Cek Keputusan',
      analyzing: 'AI Sedang Menganalisis...',
      aiAdvice: 'Saran AI',
      warning: 'Perhatian: Pembelian ini melebihi sisa anggaran atau batas pengeluaran Anda!',
      good: 'Dana tersedia dan aman untuk pembelian ini.'
    },
    // Goals
    goals: {
      title: 'Target Keuangan',
      subtitle: 'Wujudkan impian finansial Anda',
      newGoal: 'Target Baru',
      goalName: 'Nama Target',
      targetAmount: 'Jumlah Target',
      deadline: 'Tenggat Waktu',
      monthlySaving: 'Tabungan per Bulan',
      progress: 'Terkumpul',
      deleteConfirm: 'Hapus target keuangan ini?',
      addFunds: 'Tambah Dana',
      addAmount: 'Jumlah Ditambahkan',
      congratulations: 'Selamat! Target tercapai!'
    },
    // Savings
    savings: {
      title: 'Tabungan',
      subtitle: 'Kelola rekening dan celengan Anda',
      newAccount: 'Akun Baru',
      addFunds: 'Tambah Saldo',
      accountName: 'Nama Akun / Bank',
      initialBalance: 'Saldo Awal',
      type: 'Tipe',
      bank: 'Bank',
      cash: 'Tunai',
      ewallet: 'E-Wallet',
      investment: 'Investasi',
      deleteConfirm: 'Hapus akun ini beserta semua transaksinya?'
    },
    // Recurring
    recurring: {
      title: 'Tagihan Rutin',
      subtitle: 'Kelola langganan dan cicilan bulanan',
      newBill: 'Tagihan Baru',
      billName: 'Nama Tagihan',
      billAmount: 'Jumlah',
      dueDate: 'Tanggal Jatuh Tempo (1-31)',
      autoPay: 'Catat Otomatis',
      autoPayDesc: 'Otomatis catat transaksi pengeluaran pada tanggal jatuh tempo',
      markPaid: 'Tandai Dibayar',
      upcoming: 'Akan Datang',
      paid: 'Lunas'
    }
  },

  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      transactions: 'Transactions',
      savings: 'Savings',
      goals: 'Goals',
      reports: 'Reports',
      forecast: 'Forecast',
      advisor: 'AI Advisor',
      decision: 'Buy Checker',
      settings: 'Settings',
      logout: 'Logout',
      login: 'Login'
    },
    // Common
    common: {
      income: 'Income',
      expense: 'Expense',
      balance: 'Balance',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      date: 'Date',
      amount: 'Amount',
      category: 'Category',
      account: 'Account',
      description: 'Description',
      tags: 'Tags',
      month: 'Month',
      all: 'All',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error'
    },
    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'Manage preferences and spending limits',
      spendingGuard: 'Spending Guard — Limit',
      spendingGuardDesc: 'Set a daily/weekly limit. If exceeded, new transactions will be blocked.',
      active: 'Enable Spending Guard',
      limitAmount: 'Spending Limit',
      period: 'Limit Period',
      daily: 'Daily',
      weekly: 'Weekly',
      cooldown: 'Cooldown Duration',
      hours: 'Hours',
      days: 'Days',
      appearance: 'Appearance & Theme',
      appearanceDesc: 'Customize app colors and theme.',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      amoled: 'Dark (AMOLED)',
      accentColor: 'Accent Color',
      language: 'Language',
      languageDesc: 'Choose app interface language.',
      selectLanguage: 'Select Language',
      indonesian: 'Bahasa Indonesia',
      english: 'English',
      aiPersonality: 'AI Advisor Personality',
      aiPersonalityDesc: 'Choose the tone and style used by the Gemini AI Advisor when responding to your questions.',
      selectAiPersonality: 'Select Personality',
      aiPro: 'Professional & Friendly (Default)',
      aiRoast: 'Roast Mode (Sarcastic & Harsh)',
      aiZen: 'Zen Mode (Supportive & Patient)',
      blocked: 'Transactions Temporarily Blocked',
      blockedDesc: 'Limit exceeded. Try again in:',
      warning: 'Approaching Spending Limit!',
      ok: 'Spending Under Control',
      used: 'Used'
    },
    // Quick Add
    quickAdd: {
      title: 'Record Transaction',
      scanReceipt: 'Scan Receipt (AI)',
      takePhoto: 'Take Photo',
      uploadImage: 'Upload Image',
      guessCategory: 'Guess Category with AI',
      overBudget: 'Over Budget!',
      transfer: 'Transfer Between Accounts',
      fromAccount: 'From Account',
      toAccount: 'To Account',
      fee: 'Admin Fee (Optional)',
      transferSuccess: 'Transfer recorded successfully'
    },
    // Transactions
    transactions: {
      title: 'Transaction History',
      subtitle: 'Manage your financial records',
      search: 'Search transactions...',
      noTransactions: 'No transactions this month',
      emptySearch: 'No matching transactions'
    },
    // Reports
    reports: {
      title: 'Reports',
      subtitle: 'Financial analysis',
      downloadPdf: 'Download PDF',
      totalIncome: 'Total Income',
      totalExpense: 'Total Expense',
      expenseByCategory: 'Expense by Category',
      noExpenseData: 'No expense data',
      trend: '6-Month Trend',
      breakdown: 'Category Breakdown',
      aiHabits: 'AI Spending Habit Analysis',
      analyzeMonth: 'Analyze This Month',
      analyzing: 'Reading your spending habits...',
      reAnalyze: 'Re-Analyze',
      habitDesc: 'Click the button above to get insights on your spending patterns this month compared to the last 5 months.'
    },
    // Forecast
    forecast: {
      title: 'Financial Forecast',
      subtitle: 'Expense prediction until end of month',
      dailyAvg: 'Daily Average Expense',
      dailyAvgSub: 'Based on elapsed days',
      prediction: 'End of Month Prediction',
      predictionSub: 'If spending speed is maintained',
      safeDeficit: 'Safe Remaining / Deficit',
      safeDeficitSub: 'Income minus predicted expense',
      aiInsight: 'AI Insight & Early Warning',
      analyzing: 'Analyzing your spending patterns...'
    },
    // AiAdvisor
    advisor: {
      title: 'AI Financial Advisor',
      subtitle: 'Powered by Gemini',
      clearChat: 'Clear Chat',
      inputPlaceholder: 'Ask about your finances...',
      clearConfirm: 'Delete all conversation history?',
      cleared: 'Conversation history cleared. What would you like to discuss now?',
      welcome: 'Hello! I am FinanceMe AI Advisor. How can I help you with your finances today?',
      error: 'Sorry, there was an error contacting the AI. Please try again.'
    },
    // Decision Maker
    decision: {
      title: 'AI Decision Calculator',
      subtitle: 'Ask AI before buying your dream items',
      itemName: 'Item Name',
      itemPrice: 'Item Price',
      urgency: 'Urgency Level (1-10)',
      urgencyDesc: '1 = Not needed at all, 10 = Very urgent',
      reason: 'Reason to Buy',
      check: 'Check Decision',
      analyzing: 'AI is Analyzing...',
      aiAdvice: 'AI Advice',
      warning: 'Warning: This purchase exceeds your remaining budget or spending limit!',
      good: 'Funds are available and safe for this purchase.'
    },
    // Goals
    goals: {
      title: 'Financial Goals',
      subtitle: 'Make your financial dreams come true',
      newGoal: 'New Goal',
      goalName: 'Goal Name',
      targetAmount: 'Target Amount',
      deadline: 'Deadline',
      monthlySaving: 'Monthly Saving',
      progress: 'Gathered',
      deleteConfirm: 'Delete this financial goal?',
      addFunds: 'Add Funds',
      addAmount: 'Amount Added',
      congratulations: 'Congratulations! Goal reached!'
    },
    // Savings
    savings: {
      title: 'Savings',
      subtitle: 'Manage your accounts and piggy banks',
      newAccount: 'New Account',
      addFunds: 'Add Balance',
      accountName: 'Account / Bank Name',
      initialBalance: 'Initial Balance',
      type: 'Type',
      bank: 'Bank',
      cash: 'Cash',
      ewallet: 'E-Wallet',
      investment: 'Investment',
      deleteConfirm: 'Delete this account and all its transactions?'
    },
    // Recurring
    recurring: {
      title: 'Recurring Bills',
      subtitle: 'Manage subscriptions and monthly installments',
      newBill: 'New Bill',
      billName: 'Bill Name',
      billAmount: 'Amount',
      dueDate: 'Due Date (1-31)',
      autoPay: 'Auto Record',
      autoPayDesc: 'Automatically record expense transaction on due date',
      markPaid: 'Mark as Paid',
      upcoming: 'Upcoming',
      paid: 'Paid'
    }
  }
};
