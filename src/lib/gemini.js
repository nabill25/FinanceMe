import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let aiClient = null;

if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

/**
 * Scan a receipt or transfer proof using Gemini 1.5 Flash
 * @param {string} base64Image - Base64 encoded image string (without data:image/... prefix)
 * @param {string} mimeType - The mime type of the image (e.g. image/jpeg)
 * @param {Array<{id: string, name: string, type: string}>} categories - Optional array of categories
 * @returns {Promise<{ amount: number, description: string, category_type: 'income' | 'expense', category_id?: string, date?: string }>}
 */
export const scanReceipt = async (base64Image, mimeType, categories = []) => {
  if (!aiClient) {
    throw new Error('API Key Gemini belum diatur (VITE_GEMINI_API_KEY). Silakan tambahkan di .env.local');
  }

  const categoryListStr = categories.length > 0 
    ? categories.map(c => `- ID: "${c.id}", Nama: "${c.name}", Tipe: "${c.type}"`).join('\n')
    : 'Tidak ada daftar kategori yang diberikan.';

  const prompt = `
    Anda adalah asisten keuangan pintar. Analisis gambar struk, nota, atau bukti transfer ini.
    Ekstrak data berikut dan kembalikan HANYA dalam format JSON persis seperti ini:
    {
      "amount": <angka total akhir, tipe number, tanpa simbol mata uang atau pemisah ribuan>,
      "description": "<nama toko, merchant, penerima, atau keterangan transaksi singkat>",
      "category_type": "<income atau expense>",
      "category_id": "<ID kategori yang paling cocok dari daftar yang diberikan, biarkan kosong string jika tidak ada yang cocok>",
      "date": "<Tanggal transaksi dalam format YYYY-MM-DD, biarkan kosong string jika tidak ditemukan>"
    }
    
    Daftar Kategori yang Tersedia:
    ${categoryListStr}
    
    Aturan Kritis:
    1. Abaikan pajak, subtotal, atau nominal kembalian. Cari TOTAL AKHIR yang dibayar/diterima.
    2. category_type adalah "expense" jika ini adalah struk belanja/pembayaran/transfer keluar.
    3. category_type adalah "income" jika ini adalah bukti terima uang/top up/transfer masuk.
    4. Analisis barang/layanan/nama merchant pada struk, dan pilih SATU "category_id" dari daftar kategori di atas yang konteksnya paling cocok (misal struk Alfamart -> kategori Makanan/Groceries, struk SPBU -> Transportasi).
    5. HANYA KEMBALIKAN TEKS JSON SAJA, tanpa blok kode markdown (\`\`\`json), tanpa teks pendahuluan.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ]
    });

    const text = response.text;
    
    // Clean up potential markdown formatting just in case
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '');
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```/, '');
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.replace(/```$/, '');
    }
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Gagal memproses struk: ' + error.message);
  }
};
